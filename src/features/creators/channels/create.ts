import type { ChatInputCommandInteraction } from "discord.js";
import {
  bold,
  channelMention,
  ChannelType,
  ForumLayoutType,
  PermissionFlagsBits,
  SortOrderType,
} from "discord.js";
import { compress } from "compress-tag";

import { Color, JsonError } from "../../../services/discord";
import { message, MessageMode } from "../../../services/discord/commands";

import guildSettings from "../../../settings/guild";
import { ProcessEnv } from "../../../constants";

import * as database from "./database";

export enum Option {
  CATEGORY = "category",
  GUIDELINES = "guidelines",
  NAME = "name",
  NSFW = "nsfw",
}

export default async (interaction: ChatInputCommandInteraction) => {
  const { client, guild, options } = interaction;
  if (!guild) throw new JsonError(interaction);

  const { channels } = guild;
  const guildId = guild.id;

  const settingsPromise = guildSettings(guildId);
  const countPromise = database.getCountOfCreatorChannels(guildId);

  const { maxCreatorChannels } = await settingsPromise;
  const count = await countPromise;

  if (count >= maxCreatorChannels) {
    const description = compress`
      Your request for creating a creator channel has been denied because this
      server is currently only permitted to have ${maxCreatorChannels} creator
      channel${maxCreatorChannels === 1 ? "" : "s"}.
    `;

    return message(interaction, MessageMode.REPLY, Color.ERROR, description);
  }

  const name = options.getString(Option.NAME) ?? "creators";
  const guidelines = options.getString(Option.GUIDELINES) ?? undefined;
  const category = options.getChannel(Option.CATEGORY);
  const nsfw = options.getBoolean(Option.NSFW) ?? undefined;

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

  const channel = await channels.create({
    defaultForumLayout: ForumLayoutType.GalleryView,
    defaultSortOrder: SortOrderType.CreationDate,
    name,
    nsfw,
    parent: category?.id,
    permissionOverwrites,
    topic: guidelines,
    type: ChannelType.GuildForum,
  });

  const webhookOptions = { name: ProcessEnv.PROJECT_NAME };
  const webhook = await channel.createWebhook(webhookOptions);

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
    to the channel using the following command:\n
    ${bold("/creators subscriptions create")}
  `;

  return message(interaction, MessageMode.REPLY, Color.SUCCESS, description);
};
