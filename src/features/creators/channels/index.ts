import type { ChatInputCommandInteraction } from "discord.js";

import { JsonError } from "../../../services/discord";

import onCreate from "./create";

export enum Subcommand {
  CREATE = "create",
}

export default (interaction: ChatInputCommandInteraction) => {
  const { options } = interaction;
  const subcommand = options.getSubcommand();

  switch (subcommand) {
    case Subcommand.CREATE:
      return onCreate(interaction);
    default:
      throw new JsonError(interaction);
  }
};
