import type { ChatInputCommandInteraction } from "discord.js";
import { fail as error } from "node:assert";

import onDefaultMentionRole from "./default-mention-role";
import onChannelMentionRole from "./channel-mention-role";

export enum Subcommand {
  DefaultMentionRole = "default-mention-role",
  ChannelMentionRole = "channel-mention-role",
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
