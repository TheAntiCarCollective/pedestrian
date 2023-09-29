import { glob } from "glob";
import path from "node:path";
import loggerFactory from "pino";
import { collectDefaultMetrics } from "prom-client";

import Environment from "./environment";
import server from "./server";
import discord from "./services/discord";

// region Logger and Metrics
const logger = loggerFactory({
  name: __filename,
});

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

    const serverPort = Number.parseInt(Environment.ServerPort);
    server.listen(serverPort, () => {
      logger.info(serverPort, "SERVER_LISTEN");
    });

    await discord.login();
    logger.info("DISCORD_LOGIN");
  } catch (error) {
    logger.fatal(error, "MAIN_ERROR");
    process.exitCode = 1;
  }
};

void main();
