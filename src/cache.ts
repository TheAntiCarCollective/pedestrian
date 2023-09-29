import type { Callback, Result } from "ioredis";

import loggerFactory from "pino";

import type { Lock } from "./lock";

import Environment from "./environment";
import { isNullable } from "./helpers";
import lock from "./lock";
import redis from "./services/redis";

const logger = loggerFactory({
  name: __filename,
});

// region CacheKey
const normalize = (value: string) => value.replaceAll(/\s+/g, "").toLowerCase();

const cacheKey = (key: string) => `${Environment.ProjectName}:${key}`;

export default {
  channel: (channelId: string) => cacheKey(`channel:${channelId}`),
  channels: (query: string) => cacheKey(`channels:${normalize(query)}`),
  rssFeed: (url: string) => cacheKey(`rssFeed:${url}`),
  video: (videoId: string) => cacheKey(`video:${videoId}`),
  videos: (playlistId: string) => cacheKey(`videos:${playlistId}`),
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
