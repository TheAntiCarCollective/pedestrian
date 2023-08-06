import type { ChatInputCommandInteraction } from "discord.js";
import {
  bold,
  channelMention,
  ChannelType,
  EmbedBuilder,
  ForumLayoutType,
  PermissionFlagsBits,
  SortOrderType,
} from "discord.js";
import { compress } from "compress-tag";

import { Color, JsonError } from "../../../../services/discord";
import guildSettings from "../../../../settings/guild";
import Environment from "../../../../environment";

import * as localDatabase from "./database";
import * as creatorsDatabase from "../../database";
import { getCreatorChannels } from "../../functions";

const database = {
  ...localDatabase,
  ...creatorsDatabase,
};

export enum Option {
  CATEGORY = "category",
  NAME = "name",
  NSFW = "nsfw",
}

export default async (interaction: ChatInputCommandInteraction) => {
  const { client, guild, options } = interaction;
  if (guild === null) throw new JsonError(interaction);

  const guildChannelManager = guild.channels;
  const guildId = guild.id;

  const settingsPromise = guildSettings(guildId);
  const creatorChannelsPromise = database
    .getCreatorChannelIds(guildId)
    .then((ids) => getCreatorChannels(guildChannelManager, ids));

  const { maxCreatorChannels } = await settingsPromise;
  const creatorChannels = await creatorChannelsPromise;

  if (creatorChannels.length >= maxCreatorChannels) {
    const description = compress`
      Your request for creating a creator channel has been denied because this
      server is currently only permitted to have ${maxCreatorChannels} creator
      channel${maxCreatorChannels === 1 ? "" : "s"}.
    `;

    const embed = new EmbedBuilder()
      .setColor(Color.ERROR)
      .setDescription(description);

    return interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  }

  const name = options.getString(Option.NAME) ?? "creators";
  const category = options.getChannel(Option.CATEGORY);
  const nsfw = options.getBoolean(Option.NSFW) ?? false;

  const { user } = client;
  const permissionOverwrites = [
    {
      id: guildId, // everyone ID
      deny: [PermissionFlagsBits.SendMessages],
    },
    {
      id: user.id, // bot ID
      allow: [PermissionFlagsBits.SendMessages],
    },
  ];

  const channel = await guildChannelManager.create({
    defaultForumLayout: ForumLayoutType.GalleryView,
    defaultSortOrder: SortOrderType.CreationDate,
    name,
    nsfw,
    parent: category?.id,
    permissionOverwrites,
    type: ChannelType.GuildForum,
  });

  const webhook = await channel.createWebhook({
    name: Environment.PROJECT_NAME,
  });

  const channelId = channel.id;
  const webhookId = webhook.id;
  const webhookToken = webhook.token;
  if (webhookToken === null) throw new JsonError(interaction);

  await database.createCreatorChannel({
    channelId,
    guildId,
    webhookId,
    webhookToken,
  });

  const description = compress`
    Successfully created ${channelMention(channelId)}! Posts will be created
    once creators are subscribed to the channel. Creators can be subscribed
    to the channel using the following command:
    \n${bold("/creators subscriptions create")}
  `;

  const embed = new EmbedBuilder()
    .setColor(Color.SUCCESS)
    .setDescription(description);

  return interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
};
