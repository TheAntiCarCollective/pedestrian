import type { ChatInputCommandInteraction } from "discord.js";

import { JsonError } from "../../../services/discord";

import onServer from "./server";

export enum Subcommand {
  SERVER = "server",
}

export default (interaction: ChatInputCommandInteraction) => {
  const { options } = interaction;
  const subcommand = options.getSubcommand();

  switch (subcommand) {
    case Subcommand.SERVER:
      return onServer(interaction);
    default:
      throw new JsonError(interaction);
  }
};
