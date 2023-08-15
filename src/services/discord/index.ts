import type { EmbedBuilder, JSONEncodable } from "discord.js";
import { Events, Client } from "discord.js";
import loggerFactory from "pino";

const logger = loggerFactory({
  name: __filename,
});

export enum Color {
  ERROR = 0xed4245, // Red
  INFORMATIONAL = 0x5865f2, // Blurple
  SUCCESS = 0x57f287, // Green
}

export class JsonError<T> extends Error {
  constructor(encodable: JSONEncodable<T>) {
    const value = encodable.toJSON();
    const message = JSON.stringify(value);
    super(message);
  }
}

export const addField = (
  embed: EmbedBuilder,
  name: string,
  value: string | null | undefined,
  inline?: boolean,
) => {
  if (typeof value !== "string") return embed;
  return embed.addFields({ name, value, inline });
};

const discord = new Client({
  intents: ["Guilds"],
});

discord.on(Events.Debug, (debug) => {
  logger.debug(debug, "DISCORD_DEBUG");
});

discord.on(Events.Warn, (warn) => {
  logger.warn(warn, "DISCORD_WARN");
});

discord.on(Events.Error, (error) => {
  logger.error(error, "DISCORD_ERROR");
});

export default discord;
