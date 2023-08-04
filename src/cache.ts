import { v4 as uuid } from "uuid";

import redis from "./services/redis";
import Environment from "./environment";
import sleep from "./sleep";

const LOCK_TIMEOUT = 1_000;

// region CacheKey
const normalizeInput = (value: string) =>
  value.replace(/\s+/g, "").toLowerCase();

const keyPrefix = normalizeInput(Environment.PROJECT_NAME);

export const CacheKey = {
  channel: (channelId: string) => `${keyPrefix}:channel:${channelId}`,
  channels: (query: string) => `${keyPrefix}:channels:${normalizeInput(query)}`,
  lock: (key: string) => `${keyPrefix}:lock:${key}`,
  videos: (playlistId: string) => `${keyPrefix}:videos:${playlistId}`,
} as const;
// endregion

const onRejected =
  <T>(defaultValue: T) =>
  (error: unknown) => {
    console.error(error);
    return defaultValue;
  };

const get = async <T>(key: string) => {
  const redisPromise = redis.get(key);
  const json = await redisPromise.catch(onRejected(null));

  if (json === null) return undefined;
  return JSON.parse(json) as T;
};

const tryLock = async (lockKey: string, lockToken: string) => {
  const redisPromise = redis.set(lockKey, lockToken, {
    GET: true,
    NX: true,
    PX: LOCK_TIMEOUT,
  });

  const previousLockToken = await redisPromise.catch(onRejected(null));
  return previousLockToken === null || previousLockToken === lockToken;
};

const lock = async (lockKey: string, lockToken: string) => {
  while (!(await tryLock(lockKey, lockToken))) {
    const redisPromise = redis.pTTL(lockKey);
    const untilLockExpires = await redisPromise.catch(onRejected(0));
    await sleep(untilLockExpires);
  }
};

const extendLock = (lockKey: string, lockToken: string) => {
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("pexpire", KEYS[1], ARGV[2])
    else
      return 0
    end
  `;

  const redisPromise = redis.eval(script, {
    arguments: [lockToken, LOCK_TIMEOUT.toString()],
    keys: [lockKey],
  });

  return redisPromise.catch(onRejected(0));
};

const atomicSet = (
  lockKey: string,
  lockToken: string,
  key: string,
  value: unknown,
  expireInMilliseconds: number,
) => {
  const json = JSON.stringify(value);

  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("set", KEYS[2], ARGV[2], "px", ARGV[3])
    else
      return nil
    end
  `;

  const redisPromise = redis.eval(script, {
    arguments: [lockToken, json, expireInMilliseconds.toString()],
    keys: [lockKey, key],
  });

  return redisPromise.catch(onRejected(null));
};

const unlock = (lockKey: string, lockToken: string) => {
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;

  const redisPromise = redis.eval(script, {
    arguments: [lockToken],
    keys: [lockKey],
  });

  return redisPromise.catch(onRejected(0));
};

const computeIfAbsent = async <T>(
  key: string,
  callback: () => Promise<NonNullable<T>>,
  expireInMilliseconds: number = Number.MAX_VALUE,
) => {
  const lockKey = CacheKey.lock(key);
  const lockToken = uuid();
  await lock(lockKey, lockToken);

  let value = await get<NonNullable<T>>(key);

  if (value === undefined) {
    const callbackPromise = callback();
    while (value === undefined) {
      await extendLock(lockKey, lockToken);

      const sleepPromise = sleep(LOCK_TIMEOUT / 2);
      const result = await Promise.race([callbackPromise, sleepPromise]);
      value = result === undefined ? undefined : result;
    }

    await atomicSet(lockKey, lockToken, key, value, expireInMilliseconds);
  }

  await unlock(lockKey, lockToken);
  return value;
};

export default {
  computeIfAbsent,
};
