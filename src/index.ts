import discord from "./services/discord";
import redis from "./services/redis";
import exit, { ExitCode } from "./exit";

// Install
import "./features";

redis
  .connect()
  .then(() => discord.login())
  .catch((error) => exit(ExitCode.BOOTSTRAP_FAILED, error));
