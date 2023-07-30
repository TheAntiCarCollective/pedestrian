import type { JSONEncodable } from "discord.js";
import { Client } from "discord.js";

export enum Color {
  ERROR = 0xed4245, // Red
  INFORMATIONAL = 0x5865f2, // Blurple
  SUCCESS = 0x57f287, // Green
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

export default new Client({
  intents: ["Guilds"],
});
