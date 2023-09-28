import type { ChatInputCommandInteraction } from "discord.js";

import * as database from "./database";
import UI from "./ui";

export enum Option {
  Channel = "channel",
}

export default async (interaction: ChatInputCommandInteraction) => {
  const { channelId: defaultChannelId, options } = interaction;
  let { id: channelId } = options.getChannel(Option.Channel) ?? {};
  channelId ??= defaultChannelId;

  const channelMentionRoleId =
    await database.getChannelMentionRoleId(channelId);
  return interaction.reply(UI.setting(channelId, channelMentionRoleId));
};
