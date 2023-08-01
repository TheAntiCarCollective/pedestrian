import discord from "./services/discord";
import postgresql from "./services/postgresql";
import redis from "./services/redis";

export enum ExitCode {
  BOOTSTRAP_FAILED = 1,
}

const onExit = async () => {
  await discord.destroy();
  await redis.quit();
  await postgresql.end();
};

process.on("exit", () => {
  void onExit();
});

export default async (code: ExitCode, error: unknown): Promise<never> => {
  await onExit();
  process.exitCode = code;
  throw error;
};
