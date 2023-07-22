import discord from "./services/discord";
import postgresql from "./services/postgresql";
import redis from "./services/redis";

import { ExitCode } from "./constants";

export default async (code: ExitCode, error: unknown): Promise<never> => {
  const postgresqlPromise = postgresql.end();
  const redisPromise = redis.quit();

  discord.destroy();
  await postgresqlPromise;
  await redisPromise;

  process.exitCode = code;
  throw error;
};
