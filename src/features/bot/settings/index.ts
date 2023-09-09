import type { ChatInputCommandInteraction } from "discord.js";
import { fail as error } from "node:assert";

import { onGuild } from "./guild";

export enum Subcommand {
  Guild = "guild",
}

export default (interaction: ChatInputCommandInteraction) => {
  const { options } = interaction;
  const subcommand = options.getSubcommand();

  switch (subcommand) {
    case Subcommand.Guild:
      return onGuild(interaction);
  }

  error();
};
