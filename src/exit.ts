import discord from "./services/discord";
import postgresql from "./services/postgresql";
import redis from "./services/redis";

export enum ExitCode {
  BOOTSTRAP_FAILED = 1,
  SIGINT = 2,
}

const onExit = async (code: ExitCode) => {
  try {
    await discord.destroy();
    await redis.quit();
    await postgresql.end();
  } finally {
    process.exitCode = code;
  }
};

process.on("SIGINT", () => {
  void onExit(ExitCode.SIGINT);
});

export default async (code: ExitCode, error: unknown): Promise<never> => {
  await onExit(code);
  throw error;
};
