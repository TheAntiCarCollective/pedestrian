import { glob } from "glob";
import path from "node:path";
import { collectDefaultMetrics } from "prom-client";

import discord from "./shared/discord";
import Environment from "./shared/environment";
import express from "./shared/express";
import loggerFactory from "./shared/logger";

// region Logger and Metrics
const logger = loggerFactory(module);

collectDefaultMetrics();
// endregion

const main = async () => {
  try {
    // Import all modules automatically to trigger side effects
    const importPaths = await glob(`${__dirname}/**/*.js`);
    const imports = importPaths
      .map((importPath) => path.relative(__dirname, importPath))
      .map((importPath) => import(`./${importPath}`));
    await Promise.all(imports);

    express.listen(Environment.ExpressPort, () => {
      logger.info(`Express is listening on port ${Environment.ExpressPort}`);
    });

    await discord.login();
    logger.info("Discord finished login");
  } catch (error) {
    logger.fatal(error, "MAIN_ERROR");
    process.exitCode = 1;
  }
};

void main();
