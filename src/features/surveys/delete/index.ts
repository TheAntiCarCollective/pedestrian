import type { ChatInputCommandInteraction } from "discord.js";
import { GuildMember, PermissionFlagsBits } from "discord.js";
import assert from "node:assert";

import * as database from "./database";
import * as ui from "./ui";

export enum Option {
  Title = "title",
}

const checkPermissionsResponse = (interaction: ChatInputCommandInteraction) => {
  const { member } = interaction;
  assert(member instanceof GuildMember);
  const { permissions } = member;

  if (permissions.has(PermissionFlagsBits.ManageMessages)) return undefined;
  return interaction.reply(ui.permissionsDenied());
};

export default async (interaction: ChatInputCommandInteraction) => {
  const { guild, options } = interaction;
  assert(guild !== null);
  const { id: guildId, channels: guildChannelManager } = guild;

  let response = await checkPermissionsResponse(interaction);
  if (response !== undefined) return response;

  const title = options.getString(Option.Title, true);
  const survey = await database.deleteSurvey(guildId, title);
  response = await interaction.reply(ui.deletedSurvey(title));

  if (survey === undefined) return response;
  const { id: messageId, channelId } = survey;

  const channel = await guildChannelManager.fetch(channelId);
  assert(channel !== null);
  assert(channel.isTextBased());
  const { messages: guildMessageManager } = channel;

  await guildMessageManager.delete(messageId);
  return response;
};
