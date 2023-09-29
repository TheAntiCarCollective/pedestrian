import type { ChatInputCommandInteraction } from "discord.js";

import { fail as error } from "node:assert";

import onChannelMentionRole from "./channel-mention-role";
import onDefaultMentionRole from "./default-mention-role";

export enum Subcommand {
  ChannelMentionRole = "channel-mention-role",
  DefaultMentionRole = "default-mention-role",
}

export default (interaction: ChatInputCommandInteraction) => {
  const { options } = interaction;
  switch (options.getSubcommand()) {
    case Subcommand.DefaultMentionRole: {
      return onDefaultMentionRole(interaction);
    }
    case Subcommand.ChannelMentionRole: {
      return onChannelMentionRole(interaction);
    }
  }

  error();
};
