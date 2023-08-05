import type { Callback, Result } from "ioredis";

import redis from "./services/redis";
import sleep from "./sleep";

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
    atomicSet(
      lockKey: string, // KEYS[1]
      key: string, // KEYS[2]
      lockToken: string, // ARGV[1]
      value: string, // ARGV[2]
      expireInMilliseconds: number, // ARGV[3]
      callback?: Callback<string>,
    ): Result<string | null, Context>;
    unlock(
      lockKey: string, // KEYS[1]
      lockToken: string, // ARGV[1]
      callback?: Callback<string>,
    ): Result<number, Context>;
  }
}

const lockKey = (key: string) => `{${key}}:lock`;

export const tryLock = async (
  key: string,
  lockToken: string,
  expireInMilliseconds: number,
) => {
  let previousLockToken: string | null = null;

  try {
    previousLockToken = await redis.set(
      lockKey(key),
      lockToken,
      "PX",
      expireInMilliseconds,
      "NX",
      "GET",
    );
  } catch (error) {
    console.error(error);
  }

  return previousLockToken === null || previousLockToken === lockToken;
};

export const lock = async (
  key: string,
  lockToken: string,
  expireInMilliseconds: number,
) => {
  while (!(await tryLock(key, lockToken, expireInMilliseconds))) {
    let untilLockExpires = 0;

    try {
      untilLockExpires = await redis.pttl(lockKey(key));
    } catch (error) {
      console.error(error);
    }

    await sleep(untilLockExpires);
  }
};

export const extendLock = async (
  key: string,
  lockToken: string,
  expireInMilliseconds: number,
) => {
  try {
    await redis.extendLock(lockKey(key), lockToken, expireInMilliseconds);
  } catch (error) {
    console.error(error);
  }
};

export const atomicSet = async (
  key: string,
  lockToken: string,
  value: string,
  expireInMilliseconds: number,
) => {
  try {
    await redis.atomicSet(
      lockKey(key),
      key,
      lockToken,
      value,
      expireInMilliseconds,
    );
  } catch (error) {
    console.error(error);
  }
};

export const unlock = async (key: string, lockToken: string) => {
  try {
    await redis.unlock(lockKey(key), lockToken);
  } catch (error) {
    console.error(error);
  }
};
