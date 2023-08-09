import type { ChatInputCommandInteraction } from "discord.js";

import { JsonError } from "../../../services/discord";

import { onGuild } from "./guild";

export enum Subcommand {
  GUILD = "guild",
}

export default (interaction: ChatInputCommandInteraction) => {
  const { options } = interaction;
  const subcommand = options.getSubcommand();

  switch (subcommand) {
    case Subcommand.GUILD:
      return onGuild(interaction);
    default:
      throw new JsonError(interaction);
  }
};
