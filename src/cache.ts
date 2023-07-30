import type { SetOptions } from "redis";
import { v4 as uuid } from "uuid";

import redis from "./services/redis";
import Environment from "./environment";
import sleep from "./sleep";

const LOCK_TIMEOUT = 1_000;

// region CacheKey
const getCacheKey = (key: string) => `${Environment.PROJECT_NAME}:${key}`;

export const CacheKey = {
  channel: (channelId: string) => getCacheKey(`channel:${channelId}`),
  channels: (query: string) => getCacheKey(`channels:${query}`),
  lock: (key: string) => getCacheKey(`lock:${key}`),
  videos: (playlistId: string) => getCacheKey(`videos:${playlistId}`),
} as const;
// endregion

const asJson = async <T>(callback: () => Promise<string | null>) => {
  let json: string | null;

  try {
    json = await callback();
  } catch (error) {
    console.error(error);
    json = null;
  }

  if (json === null) return undefined;
  return JSON.parse(json) as NonNullable<T>;
};

const get = <T>(key: string) => asJson<T>(() => redis.get(key));

const set = <T>(key: string, value: NonNullable<T>, options: SetOptions) => {
  const json = JSON.stringify(value);
  if (json !== undefined) return asJson<T>(() => redis.set(key, json, options));
  throw new Error(`${key}: ${value.toString()}`);
};

const putIfAbsent = <T>(
  key: string,
  value: NonNullable<T>,
  expireInMilliseconds?: number,
) =>
  set<T>(key, value, {
    GET: true,
    NX: true,
    PX: expireInMilliseconds,
  });

const tryLock = async (lockKey: string, lockToken: string) => {
  // prettier-ignore
  const previousLockToken = await putIfAbsent(lockKey, lockToken, LOCK_TIMEOUT);
  return previousLockToken === undefined || previousLockToken === lockToken;
};

const extendLock = (lockKey: string, lockToken: string) => {
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1]
    then
      return redis.call("pexpire", KEYS[1], ARGV[2])
    else
      return 0
    end
  `;

  return redis.eval(script, {
    arguments: [lockToken, LOCK_TIMEOUT.toString()],
    keys: [lockKey],
  });
};

const atomicSet = <T>(
  lockKey: string,
  lockToken: string,
  key: string,
  value: NonNullable<T>,
  expireInMilliseconds: number,
) => {
  const json = JSON.stringify(value);
  if (json === undefined) throw new Error(`${key}: ${value.toString()}`);

  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1]
    then
      return redis.call("set", KEYS[2], ARGV[2], "px", ARGV[3])
    else
      return nil
    end
  `;

  return redis.eval(script, {
    arguments: [lockToken, json, expireInMilliseconds.toString()],
    keys: [lockKey, key],
  });
};

const unlock = (lockKey: string, lockToken: string) => {
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1]
    then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;

  return redis.eval(script, {
    arguments: [lockToken],
    keys: [lockKey],
  });
};

const computeIfAbsent = async <T>(
  key: string,
  callback: () => Promise<NonNullable<T>>,
  expireInMilliseconds: number = Number.MAX_VALUE,
) => {
  const lockKey = CacheKey.lock(key);
  const lockToken = uuid();

  while (!(await tryLock(lockKey, lockToken))) {
    const untilLockExpires = await redis.pTTL(lockKey);
    await sleep(untilLockExpires);
  }

  let value = await get<T>(key);

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
