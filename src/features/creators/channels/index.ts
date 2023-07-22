import type { ChatInputCommandInteraction } from "discord.js";

import { JsonError } from "../../../services/discord";

import create from "./create";

export enum Subcommand {
  CREATE = "create",
}

export default (interaction: ChatInputCommandInteraction) => {
  const { options } = interaction;
  const subcommand = options.getSubcommand();

  switch (subcommand) {
    case Subcommand.CREATE:
      return create(interaction);
    default:
      throw new JsonError(interaction);
  }
};
