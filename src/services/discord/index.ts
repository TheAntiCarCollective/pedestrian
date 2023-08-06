import type { JSONEncodable } from "discord.js";
import { Events, Client } from "discord.js";
import loggerFactory from "pino";

const logger = loggerFactory({
  name: __dirname,
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

const discord = new Client({
  intents: ["Guilds"],
});

discord.on(Events.Error, (error) => {
  logger.error(error, "DISCORD_ERROR");
});

export default discord;
