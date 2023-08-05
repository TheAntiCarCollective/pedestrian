import redis from "./services/redis";
import Environment from "./environment";

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

const get = async <T>(key: string) => {
  let json: string | null;

  try {
    json = await redis.get(key);
  } catch (error) {
    console.error(error);
    json = null;
  }

  if (json === null) return undefined;
  return JSON.parse(json) as T;
};

const set = async (
  key: string,
  value: unknown,
  expireInMilliseconds: number,
) => {
  const json = JSON.stringify(value);

  try {
    await redis.set(key, json, {
      PX: expireInMilliseconds,
    });
  } catch (error) {
    console.error(error);
  }
};

const computeIfAbsent = async <T>(
  key: string,
  callback: () => Promise<NonNullable<T>>,
  expireInMilliseconds: number = Number.MAX_VALUE,
) => {
  let value = await get<NonNullable<T>>(key);

  if (value === undefined) {
    value = await callback();
    await set(key, value, expireInMilliseconds);
  }

  return value;
};

export default {
  computeIfAbsent,
};
