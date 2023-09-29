import type { ChatInputCommandInteraction } from "discord.js";

import { GuildMember, PermissionFlagsBits } from "discord.js";
import assert from "node:assert";

import * as database from "./database";
import UI from "./ui";

export enum Option {
  Title = "title",
}

const checkPermissionsResponse = (interaction: ChatInputCommandInteraction) => {
  const { member } = interaction;
  assert(member instanceof GuildMember);
  const { permissions } = member;

  if (permissions.has(PermissionFlagsBits.ManageMessages)) return;
  return interaction.reply(UI.permissionsDenied());
};

export default async (interaction: ChatInputCommandInteraction) => {
  const { guild, options, user } = interaction;
  assert(guild !== null);
  const { channels: guildChannelManager, id: guildId } = guild;

  const title = options.getString(Option.Title, true);
  const partialSurvey = await database.getPartialSurvey(guildId, title);

  if (partialSurvey?.createdBy !== user.id) {
    const response = await checkPermissionsResponse(interaction);
    if (response !== undefined) return response;
  }

  await database.deleteSurvey(guildId, title);
  const response = await interaction.reply(UI.deletedSurvey(title));

  if (partialSurvey !== undefined) {
    const { channelId, id: messageId } = partialSurvey;
    const channels = guildChannelManager.valueOf();
    const channel = channels.get(channelId);

    if (channel !== undefined) {
      assert(channel.isTextBased());
      const { messages: guildMessageManager } = channel;
      await guildMessageManager.delete(messageId);
    }
  }

  return response;
};
