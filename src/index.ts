import loggerFactory from "pino";

import discord from "./services/discord";

// Install
import "./features";

// region Module Objects
const logger = loggerFactory({
  name: __filename,
});
// endregion

discord.login().catch((error) => {
  logger.fatal(error, "DISCORD_LOGIN_ERROR");
});
