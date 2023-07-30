import discord from "./services/discord";
import postgresql from "./services/postgresql";
import redis from "./services/redis";

export enum ExitCode {
  BOOTSTRAP_FAILED = 1,
}

export default async (code: ExitCode, error: unknown): Promise<never> => {
  const postgresqlPromise = postgresql.end();
  const redisPromise = redis.quit();

  discord.destroy();
  await postgresqlPromise;
  await redisPromise;

  process.exitCode = code;
  throw error;
};
