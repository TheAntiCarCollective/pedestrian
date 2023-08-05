import { v4 as uuid } from "uuid";

import redis from "./services/redis";
import Environment from "./environment";
import { atomicSet, extendLock, lock, unlock } from "./lock";
import sleep from "./sleep";

// region CacheKey
const normalizeInput = (value: string) =>
  value.replace(/\s+/g, "").toLowerCase();

const keyPrefix = normalizeInput(Environment.PROJECT_NAME);

export const CacheKey = {
  channel: (channelId: string) => `${keyPrefix}:channel:${channelId}`,
  channels: (query: string) => `${keyPrefix}:channels:${normalizeInput(query)}`,
  videos: (playlistId: string) => `${keyPrefix}:videos:${playlistId}`,
} as const;
// endregion

const LOCK_TIMEOUT = 1_000;

const get = async <T>(key: string) => {
  let json: string | null = null;

  try {
    json = await redis.get(key);
  } catch (error) {
    console.error(error);
  }

  if (json === null) return undefined;
  return JSON.parse(json) as T;
};

const computeIfAbsent = async <T>(
  key: string,
  callback: () => Promise<NonNullable<T>>,
  expireInMilliseconds: number = Number.MAX_VALUE,
) => {
  const lockToken = uuid();
  await lock(key, lockToken, LOCK_TIMEOUT);

  let value = await get<NonNullable<T>>(key);
  if (value === undefined) {
    const callbackPromise = callback();

    while (value === undefined) {
      await extendLock(key, lockToken, LOCK_TIMEOUT);
      const sleepPromise = sleep(LOCK_TIMEOUT / 2);
      const result = await Promise.race([callbackPromise, sleepPromise]);
      value = result === undefined ? undefined : result;
    }

    const json = JSON.stringify(value);
    await atomicSet(key, lockToken, json, expireInMilliseconds);
  }

  await unlock(key, lockToken);
  return value;
};

export default {
  computeIfAbsent,
};
