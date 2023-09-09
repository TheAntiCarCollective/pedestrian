import { youtube_v3 } from "@googleapis/youtube";
import PlaylistItemSnippet = youtube_v3.Schema$PlaylistItemSnippet;

import type { Guild } from "discord.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  DiscordAPIError,
  Events,
  roleMention,
} from "discord.js";
import loggerFactory from "pino";

import discord from "../../../services/discord";
import { getThumbnailUrl, getVideoUrl } from "../../../services/youtube";
import sleep from "../../../sleep";

import type { CreatorSubscription } from "./database";
import * as postDatabase from "./database";
import * as creatorsDatabase from "../database";
import * as youtube from "../youtube";
import { CreatorType } from "../constants";

// Install
import ComponentId from "./components";
import "./components/description.button";

const logger = loggerFactory({
  name: __filename,
});

const getWebhook = async ({
  creatorChannelId,
  webhookId,
  webhookToken,
}: CreatorSubscription) => {
  try {
    return await discord.fetchWebhook(webhookId, webhookToken);
  } catch (error) {
    if (error instanceof DiscordAPIError && error.status === 404) {
      await creatorsDatabase.deleteCreatorChannels([creatorChannelId]);
      logger.info(error, "GET_WEBHOOK_ERROR");
      return undefined;
    }

    throw error;
  }
};

const postFromYouTube = async (creatorSubscription: CreatorSubscription) => {
  const webhook = await getWebhook(creatorSubscription);
  if (webhook === undefined) return;

  const {
    creatorDomainId,
    creatorType,
    creatorChannelId,
    creatorChannelType,
    creatorParentId,
    createdAt,
    creatorMentionRoleId,
  } = creatorSubscription;

  const { contentDetails, snippet } = await youtube.getChannel(creatorDomainId);
  const { relatedPlaylists } = contentDetails ?? {};
  const { uploads } = relatedPlaylists ?? {};
  if (uploads === undefined) return;

  const { title: channelName, thumbnails } = snippet ?? {};
  if (typeof channelName !== "string") return;

  const post = async (video: PlaylistItemSnippet) => {
    const { publishedAt, resourceId, title } = video;
    const { videoId } = resourceId ?? {};

    if (typeof videoId !== "string") return;
    const exists = await postDatabase.doesCreatorPostExist({
      contentId: videoId,
      creatorChannelId,
      creatorDomainId,
      creatorType,
    });

    if (exists) return;
    if (typeof publishedAt !== "string" || typeof title !== "string") return;

    const videoDate = new Date(publishedAt);
    if (videoDate < createdAt) return;

    const videoUrl = getVideoUrl(videoId);
    const content =
      creatorMentionRoleId === null
        ? videoUrl
        : `${roleMention(creatorMentionRoleId)}\n${videoUrl}`;

    const threadId = creatorParentId === null ? undefined : creatorChannelId;
    const threadName = `${channelName} - ${title}`.substring(0, 100);
    const webhookThreadName =
      creatorChannelType === ChannelType.GuildForum ? threadName : undefined;

    const button = new ButtonBuilder()
      .setEmoji("📰")
      .setLabel("| View Description")
      .setStyle(ButtonStyle.Primary)
      .setCustomId(ComponentId.DescriptionButton);

    const buttonActionRow =
      // prettier-ignore
      new ActionRowBuilder<ButtonBuilder>()
        .addComponents(button);

    const message = await webhook.send({
      avatarURL: getThumbnailUrl(thumbnails),
      components: [buttonActionRow],
      content,
      username: channelName,
      threadId,
      threadName: webhookThreadName,
    });

    try {
      await postDatabase.createCreatorPost({
        id: message.id,
        creatorChannelId,
        creatorType,
        creatorDomainId,
        contentId: videoId,
      });
    } catch (error) {
      await webhook.deleteMessage(message, threadId);
      throw error;
    }

    switch (creatorChannelType) {
      case ChannelType.GuildAnnouncement:
        await message.crosspost();
      // falls through
      case ChannelType.GuildText:
        await message.startThread({ name: threadName });
    }
  };

  const videos = await youtube.getVideos(uploads);
  videos.sort(({ publishedAt: a }, { publishedAt: b }) => {
    if (typeof a !== "string" || typeof b !== "string") return 0;
    const aDate = new Date(a);
    const bDate = new Date(b);
    return aDate.getTime() - bDate.getTime();
  });

  const promises = videos.map(post);
  await Promise.all(promises);
};

const postInGuild = async ({ id: guildId }: Guild) => {
  const creatorSubscriptions =
    await postDatabase.getCreatorSubscriptions(guildId);

  const promises = creatorSubscriptions.map(async (creatorSubscription) => {
    try {
      switch (creatorSubscription.creatorType) {
        case CreatorType.YouTube:
          await postFromYouTube(creatorSubscription);
          return;
      }
    } catch (error) {
      logger.error(error, "POST_IN_GUILD_ERROR");
    }
  });

  return Promise.all(promises);
};

discord.once(Events.ClientReady, async (client) => {
  while (process.exitCode === undefined) {
    const now = new Date();
    const untilNextHour = 3600000 - (now.getTime() % 3600000);
    await sleep(untilNextHour);

    const { guilds: guildManager } = client;
    const guilds = guildManager.valueOf();
    const promises = guilds.map(postInGuild);

    await Promise.all(promises);
  }
});
