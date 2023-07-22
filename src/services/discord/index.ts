import type { JSONEncodable } from "discord.js";
import { Client } from "discord.js";

const discord = new Client({
  intents: ["Guilds"],
});

export enum Color {
  ERROR = 0xff0000,
  INFORMATIONAL = 0x0000ff,
  SUCCESS = 0x00ff00,
}

export class JsonError<T> extends Error {
  constructor(encodable: JSONEncodable<T>) {
    const value = encodable.toJSON();
    let message: string | undefined = JSON.stringify(value);
    message = message === undefined ? value?.toString() : message;
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    message = message === undefined ? encodable.toString() : message;
    super(message);
  }
}

export default discord;
