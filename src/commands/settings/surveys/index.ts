import type { ChatInputCommandInteraction } from "discord.js";
import { fail as error } from "node:assert";

import onCreatorRole from "./creator-role";

export enum Subcommand {
  CreatorRole = "creator-role",
}

export default (interaction: ChatInputCommandInteraction) => {
  const { options } = interaction;
  switch (options.getSubcommand()) {
    case Subcommand.CreatorRole: {
      return onCreatorRole(interaction);
    }
  }

  error();
};
