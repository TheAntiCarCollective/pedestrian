import loggerFactory from "pino";

import discord from "./services/discord";

// Install
import "./features";

const logger = loggerFactory({
  name: __filename,
});

discord.login().catch((error) => {
  logger.fatal(error, "DISCORD_LOGIN_ERROR");
});
