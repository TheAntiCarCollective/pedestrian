import redis from "./services/redis";

export const get = async <T>(key: string) => {
  let value: string | null;

  try {
    value = await redis.get(key);
  } catch (error) {
    console.error(error);
    value = null;
  }

  if (value === null) return undefined;
  return JSON.parse(value) as T;
};

export const set = async (key: string, object: unknown) => {
  const value = JSON.stringify(object);
  if (value === undefined) throw new Error(`${key}: ${object?.toString()}`);

  try {
    await redis.set(key, value);
  } catch (error) {
    console.error(error);
  }
};

export const getOrSet = async <T>(key: string, callback: () => Promise<T>) => {
  let value = await get<T>(key);
  if (value !== undefined) return value;

  value = await callback();
  await set(key, value);
  return value;
};
