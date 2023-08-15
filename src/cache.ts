import type { Callback, Result } from "ioredis";
import loggerFactory from "pino";

import redis from "./services/redis";
import Environment from "./environment";
import type { Lock } from "./lock";
import lock from "./lock";

const logger = loggerFactory({
  name: __filename,
});

// region CacheKey
const normalizeInput = (value: string) =>
  value.replace(/\s+/g, "").toLowerCase();

const keyPrefix = normalizeInput(Environment.PROJECT_NAME);

export const CacheKey = {
  channel: (channelId: string) => `${keyPrefix}:channel:${channelId}`,
  channels: (query: string) => `${keyPrefix}:channels:${normalizeInput(query)}`,
  videos: (playlistId: string) => `${keyPrefix}:videos:${playlistId}`,
  video: (videoId: string) => `${keyPrefix}:video:${videoId}`,
} as const;
// endregion

// region Redis
redis.defineCommand("atomicSet", {
  numberOfKeys: 2,
  lua: `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("set", KEYS[2], ARGV[2], "px", ARGV[3])
    else
      return nil
    end
  `,
});

declare module "ioredis" {
  interface RedisCommander<Context> {
    atomicSet(
      lockKey: string, // KEYS[1]
      key: string, // KEYS[2]
      lockToken: string, // ARGV[1]
      value: string, // ARGV[2]
      expireInMilliseconds: number, // ARGV[3]
      callback?: Callback<string>,
    ): Result<string | null, Context>;
  }
}

export const atomicSet = async (
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
  let json: string | null = null;

  try {
    json = await redis.get(key);
  } catch (error) {
    logger.error(error, "GET_ERROR");
  }

  if (json === null) return undefined;
  return JSON.parse(json) as T;
};
// endregion

const computeIfAbsent = async <T>(
  key: string,
  callback: () => Promise<NonNullable<T>>,
  expireInMilliseconds = Number.MAX_VALUE,
) => {
  let value = await get<NonNullable<T>>(key);

  if (value === undefined) {
    value = await lock(key, async (lock) => {
      let value = await get<NonNullable<T>>(key);

      if (value === undefined) {
        value = await callback();
        const json = JSON.stringify(value);
        await atomicSet(lock, key, json, expireInMilliseconds);
      }

      return value;
    });
  }

  return value;
};

export default {
  computeIfAbsent,
};
