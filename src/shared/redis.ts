import type { Callback, Result } from "ioredis";

import { Redis } from "ioredis";
import * as crypto from "node:crypto";

import Environment from "./environment";
import loggerFactory from "./logger";
import { isNullable } from "./nullable";
import sleep from "./sleep";

const logger = loggerFactory(module);

// region redis
const node = {
  host: Environment.RedisHost,
  port: Environment.RedisPort,
};

const user = {
  password: Environment.RedisPassword,
  username: Environment.RedisUsername,
};

const createRedisByCluster = () =>
  new Redis.Cluster([node], {
    redisOptions: {
      ...user,
    },
  });

const createRedisByClient = () =>
  new Redis({
    ...node,
    ...user,
  });

const redis = Environment.RedisCluster
  ? createRedisByCluster()
  : createRedisByClient();

redis.on("error", (error) => {
  logger.error(error, "REDIS_ERROR");
});
// endregion

// region Lock
// region Types
type Lock = {
  key: string;
  token: string;
};
// endregion

// region Redis
redis.defineCommand("extendLock", {
  lua: `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("pexpire", KEYS[1], ARGV[2])
    else
      return 0
    end
  `,
  numberOfKeys: 1,
});

redis.defineCommand("unlock", {
  lua: `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `,
  numberOfKeys: 1,
});

declare module "ioredis" {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface RedisCommander<Context> {
    extendLock(
      lockKey: string, // KEYS[1]
      lockToken: string, // ARGV[1]
      expireInMilliseconds: number, // ARGV[2]
      callback?: Callback<string>,
    ): Result<number, Context>;
    unlock(
      lockKey: string, // KEYS[1]
      lockToken: string, // ARGV[1]
      callback?: Callback<string>,
    ): Result<number, Context>;
  }
}
// endregion

const tryLock = async (lockKey: string, expireInMilliseconds: number) => {
  const lockTokenBytes = crypto.randomBytes(16);
  const lockToken = lockTokenBytes.toString("hex");
  let previousLockToken;

  try {
    previousLockToken = await redis.set(
      lockKey,
      lockToken,
      "PX",
      expireInMilliseconds,
      "NX",
      "GET",
    );
  } catch (error) {
    logger.error(error, "TRY_LOCK_ERROR");
  }

  return previousLockToken === null
    ? {
        key: lockKey,
        token: lockToken,
      }
    : undefined;
};

const lock = async (key: string, expireInMilliseconds: number) => {
  const lockKey = `{${key}}:lock`;
  let lockObject = await tryLock(lockKey, expireInMilliseconds);

  while (lockObject === undefined) {
    let untilLockExpires = 0;

    try {
      untilLockExpires = await redis.pttl(lockKey);
    } catch (error) {
      logger.error(error, "LOCK_ERROR");
    }

    await sleep(untilLockExpires);
    lockObject = await tryLock(lockKey, expireInMilliseconds);
  }

  return lockObject;
};

const extendLock = async (
  { key, token }: Lock,
  expireInMilliseconds: number,
) => {
  try {
    await redis.extendLock(key, token, expireInMilliseconds);
  } catch (error) {
    logger.error(error, "EXTEND_LOCK_ERROR");
  }
};

const unlock = async ({ key, token }: Lock) => {
  try {
    await redis.unlock(key, token);
  } catch (error) {
    logger.error(error, "UNLOCK_ERROR");
  }
};

const useLock = async <T>(
  key: string,
  callback: (lock: Lock) => NonNullable<T> | Promise<NonNullable<T>>,
  expireInMilliseconds = 1000,
) => {
  const lockObject = await lock(key, expireInMilliseconds);

  try {
    let callbackResult = callback(lockObject);

    while (callbackResult instanceof Promise) {
      const sleepPromise = sleep(expireInMilliseconds / 2);
      const result = await Promise.race([callbackResult, sleepPromise]);

      if (result === undefined) {
        await extendLock(lockObject, expireInMilliseconds);
      } else {
        callbackResult = result;
      }
    }

    return callbackResult;
  } finally {
    await unlock(lockObject);
  }
};
// endregion

// region Cache
// region RedisKey
const normalize = (value: string) => value.replaceAll(/\s+/g, "").toLowerCase();

const redisKey = (key: string) => `${Environment.ProjectName}:${key}`;

export default {
  Cars: redisKey("cars"),
  channel: (channelId: string) => redisKey(`channel:${channelId}`),
  channels: (query: string) => redisKey(`channels:${normalize(query)}`),
  rssFeed: (url: string) => redisKey(`rssFeed:${url}`),
  video: (videoId: string) => redisKey(`video:${videoId}`),
  videos: (playlistId: string) => redisKey(`videos:${playlistId}`),
} as const;
// endregion

// region Redis
redis.defineCommand("atomicSet", {
  lua: `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("set", KEYS[2], ARGV[2], "px", ARGV[3])
    else
      return nil
    end
  `,
  numberOfKeys: 2,
});

declare module "ioredis" {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface RedisCommander<Context> {
    atomicSet(
      lockKey: string, // KEYS[1]
      key: string, // KEYS[2]
      lockToken: string, // ARGV[1]
      value: string, // ARGV[2]
      expireInMilliseconds: number, // ARGV[3]
      callback?: Callback<string>,
    ): Result<null | string, Context>;
  }
}

const atomicSet = async (
  lock: Lock,
  key: string,
  value: string,
  expireInMilliseconds: number,
) => {
  try {
    await redis.atomicSet(
      lock.key,
      key,
      lock.token,
      value,
      expireInMilliseconds,
    );
  } catch (error) {
    logger.error(error, "ATOMIC_SET_ERROR");
  }
};

const get = async <T>(key: string) => {
  let json;

  try {
    json = await redis.get(key);
  } catch (error) {
    logger.error(error, "GET_ERROR");
  }

  return isNullable(json) ? undefined : (JSON.parse(json) as T);
};
// endregion

export const computeIfAbsent = async <T>(
  key: string,
  callback: () => Promise<NonNullable<T>>,
  cacheExpirationInMilliseconds = Number.MAX_VALUE,
  lockExpirationInMilliseconds = 1000,
) => {
  let value = await get<NonNullable<T>>(key);

  if (value === undefined) {
    value = await useLock(
      key,
      async (lock) => {
        let value = await get<NonNullable<T>>(key);

        if (value === undefined) {
          value = await callback();
          const json = JSON.stringify(value);
          await atomicSet(lock, key, json, cacheExpirationInMilliseconds);
        }

        return value;
      },
      lockExpirationInMilliseconds,
    );
  }

  return value;
};
// endregion
