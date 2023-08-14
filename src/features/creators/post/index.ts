import { youtube_v3 } from "@googleapis/youtube";
import PlaylistItemSnippet = youtube_v3.Schema$PlaylistItemSnippet;

import type { Guild } from "discord.js";
import {
  bold,
  ChannelType,
  DiscordAPIError,
  Events,
  roleMention,
} from "discord.js";
import { compress } from "compress-tag";
import loggerFactory from "pino";

import discord from "../../../services/discord";
import { getThumbnailUrl, getVideoUrl } from "../../../services/youtube";
import sleep from "../../../sleep";

import type { CreatorSubscription } from "./database";
import * as localDatabase from "./database";
import * as creatorsDatabase from "../database";
import * as youtube from "../youtube";
import { CreatorType } from "../constants";

const logger = loggerFactory({
  name: __filename,
});

const database = {
  ...localDatabase,
  ...creatorsDatabase,
};

const getWebhook = async ({
  creatorChannelId,
  webhookId,
  webhookToken,
}: CreatorSubscription) => {
  try {
    return await discord.fetchWebhook(webhookId, webhookToken);
  } catch (error) {
    if (error instanceof DiscordAPIError && error.status === 404) {
      await database.deleteCreatorChannels([creatorChannelId]);
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
    lastContentId,
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

  const post = async (video: PlaylistItemSnippet = {}) => {
    const { description, publishedAt, resourceId, title } = video;
    const { videoId } = resourceId ?? {};

    // prettier-ignore
    if (typeof publishedAt !== "string" || typeof title !== "string") return false;
    if (typeof videoId !== "string" || videoId === lastContentId) return false;

    const videoDate = new Date(publishedAt);
    if (videoDate < createdAt) return false;

    const videoUrl = getVideoUrl(videoId);
    const header =
      creatorMentionRoleId === null
        ? videoUrl
        : `${roleMention(creatorMentionRoleId)}\n${videoUrl}`;

    const rawContent = compress`
      ${header}
      \n\n${bold("Title")}
      \n${title}
      \n\n${bold("Description")}
      \n${description ?? ""}
    `;

    const content = rawContent.substring(0, 2000);
    const threadId = creatorParentId === null ? undefined : creatorChannelId;
    const threadName = `${channelName} - ${title}`.substring(0, 100);

    const webhookThreadName =
      creatorChannelType === ChannelType.GuildForum ? threadName : undefined;

    const message = await webhook.send({
      avatarURL: getThumbnailUrl(thumbnails),
      content,
      username: channelName,
      threadId,
      threadName: webhookThreadName,
    });

    await database.createCreatorPost({
      id: message.id,
      creatorChannelId,
      creatorType,
      creatorDomainId,
      contentId: videoId,
    });

    switch (creatorChannelType) {
      case ChannelType.GuildAnnouncement:
        await message.crosspost();
      // falls through
      case ChannelType.GuildText:
        await message.startThread({ name: threadName });
      // falls through
      default:
        break;
    }

    return lastContentId !== null;
  };

  const videos = await youtube.getVideos(uploads);
  // Post videos until caught up to lastContentId
  for (const video of videos) {
    const continuePosting = await post(video);
    if (!continuePosting) break;
  }
};

const postInGuild = async ({ id }: Guild) => {
  const creatorSubscriptions = await database.getCreatorSubscriptions(id);
  const promises = creatorSubscriptions.map(async (creatorSubscription) => {
    const { creatorType } = creatorSubscription;

    try {
      switch (creatorType) {
        case CreatorType.YOUTUBE:
          await postFromYouTube(creatorSubscription);
          break;
        default:
          throw new Error(creatorType);
      }
    } catch (error) {
      logger.error(error, "POSTING_ERROR");
    }
  });

  return Promise.all(promises);
};

discord.once(Events.ClientReady, async (client) => {
  while (process.exitCode === undefined) {
    const now = new Date();
    const untilNextHour = 3600000 - (now.getTime() % 3600000);
    await sleep(untilNextHour);

    const guildManager = client.guilds;
    const guilds = guildManager.valueOf();
    const promises = guilds.map(postInGuild);

    await Promise.all(promises);
  }
});
