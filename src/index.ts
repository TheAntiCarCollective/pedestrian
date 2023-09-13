import loggerFactory from "pino";

import discord from "./services/discord";
import Environment from "./environment";
import server from "./server";

// Install
import "./features";

const logger = loggerFactory({
  name: __filename,
});

const main = async () => {
  const serverPort = parseInt(Environment.ServerPort);
  server.listen(serverPort, () => {
    logger.info(serverPort, "SERVER_LISTEN");
  });

  await discord.login();
  logger.info("DISCORD_LOGIN");
};

const mainPromise = main();
mainPromise.catch((error) => {
  logger.fatal(error, "MAIN_ERROR");
  process.exitCode = 1;
});
