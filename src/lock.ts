import type { Callback, Result } from "ioredis";
import { v4 as uuid } from "uuid";
import loggerFactory from "pino";

import redis from "./services/redis";
import sleep from "./sleep";

// region Types
export type Lock = {
  key: string;
  token: string;
};
// endregion

// region Module Objects
const logger = loggerFactory({
  name: __filename,
});
// endregion

// region Redis
redis.defineCommand("extendLock", {
  numberOfKeys: 1,
  lua: `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("pexpire", KEYS[1], ARGV[2])
    else
      return 0
    end
  `,
});

redis.defineCommand("unlock", {
  numberOfKeys: 1,
  lua: `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `,
});

declare module "ioredis" {
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

const tryLock = async ({ key, token }: Lock, expireInMilliseconds: number) => {
  let previousLockToken: string | null = null;

  try {
    previousLockToken = await redis.set(
      key,
      token,
      "PX",
      expireInMilliseconds,
      "NX",
      "GET",
    );
  } catch (error) {
    logger.error(error, "TRY_LOCK_ERROR");
  }

  return previousLockToken === null || previousLockToken === token;
};

const lock = async (key: string, expireInMilliseconds: number) => {
  const lockKey = `{${key}}:lock`;
  const lockObject = {
    key: lockKey,
    token: uuid(),
  };

  while (!(await tryLock(lockObject, expireInMilliseconds))) {
    let untilLockExpires = 0;

    try {
      untilLockExpires = await redis.pttl(lockKey);
    } catch (error) {
      logger.error(error, "LOCK_ERROR");
    }

    await sleep(untilLockExpires);
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
    logger.error("UNLOCK_ERROR");
  }
};

export default async <T>(
  key: string,
  callback: (lock: Lock) => NonNullable<T> | Promise<NonNullable<T>>,
  expireInMilliseconds = 1_000,
) => {
  const lockObject = await lock(key, expireInMilliseconds);

  try {
    let callbackResult = callback(lockObject);

    while (callbackResult instanceof Promise) {
      await extendLock(lockObject, expireInMilliseconds);
      const sleepPromise = sleep(expireInMilliseconds / 2);
      const result = await Promise.race([callbackResult, sleepPromise]);
      callbackResult = result === undefined ? callbackResult : result;
    }

    return callbackResult;
  } finally {
    await unlock(lockObject);
  }
};
