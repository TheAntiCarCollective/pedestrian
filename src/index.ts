import loggerFactory from "pino";
import { collectDefaultMetrics } from "prom-client";

import discord from "./services/discord";

// Install
import "./features";
import "./server";

// region Logger and Metrics
const logger = loggerFactory({
  name: __filename,
});

collectDefaultMetrics();
// endregion

const main = async () => {
  await discord.login();
  logger.info("DISCORD_LOGIN");
};

const mainPromise = main();
mainPromise.catch((error) => {
  logger.fatal(error, "MAIN_ERROR");
  process.exitCode = 1;
});
