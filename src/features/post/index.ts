import type { Guild } from "discord.js";
import { DiscordAPIError, Events, SnowflakeUtil } from "discord.js";
import { compress } from "compress-tag";

import discord from "../../services/discord";
import { getThumbnailUrl, getVideoUrl } from "../../services/youtube";
import sleep from "../../sleep";

import type { Subscription } from "./database";
import * as database from "./database";
import * as youtube from "./youtube";
import * as creatorsDatabase from "../creators/database";
import { CreatorType } from "../creators/constants";

const getWebhook = async ({
  creatorChannelId,
  webhookId,
  webhookToken,
}: Subscription) => {
  try {
    return await discord.fetchWebhook(webhookId, webhookToken);
  } catch (error) {
    if (error instanceof DiscordAPIError && error.status === 404) {
      await creatorsDatabase.deleteCreatorChannel(creatorChannelId);
      console.info(error);
      return undefined;
    }

    throw error;
  }
};

const postFromYouTube = async (subscription: Subscription) => {
  const { creatorId, lastContentId, creatorChannelId } = subscription;

  const { contentDetails, snippet } = await youtube.getChannel(creatorId);
  const { relatedPlaylists } = contentDetails ?? {};
  const { uploads } = relatedPlaylists ?? {};
  if (uploads === undefined) return;

  const videos = await youtube.getVideos(uploads);
  const { description, publishedAt, resourceId, title } = videos[0] ?? {};
  const { videoId } = resourceId ?? {};

  if (typeof videoId !== "string" || videoId === lastContentId) return;
  if (typeof publishedAt !== "string" || typeof title !== "string") return;

  const channelTimestamp = SnowflakeUtil.timestampFrom(creatorChannelId);
  const channelDate = new Date(channelTimestamp);
  const videoDate = new Date(publishedAt);
  if (videoDate < channelDate) return;

  const webhook = await getWebhook(subscription);
  if (webhook === undefined) return;

  const { title: channelName, thumbnails } = snippet ?? {};

  const content = compress`
    ${getVideoUrl(videoId)}\n
    ${description ?? ""}
  `;

  const { id } = await webhook.send({
    avatarURL: getThumbnailUrl(thumbnails),
    content,
    username: channelName ?? undefined,
    threadName: title,
  });

  await database.createPost({
    id,
    creatorChannelId,
    creatorId,
    creatorType: CreatorType.YOUTUBE,
    contentId: videoId,
  });
};

const postInGuild = async ({ id }: Guild) => {
  const subscriptions = await database.getSubscriptions(id);
  const promises = subscriptions.map((subscription) => {
    const { creatorType } = subscription;
    switch (creatorType) {
      case CreatorType.YOUTUBE:
        return postFromYouTube(subscription);
      default:
        throw new Error(creatorType);
    }
  });

  return Promise.all(promises);
};

discord.once(Events.ClientReady, async (client) => {
  while (process.exitCode === undefined) {
    const now = new Date();
    const untilNextHour =
      (60 - now.getMinutes()) *
      (60 - now.getSeconds()) *
      (1000 - now.getMilliseconds());
    await sleep(untilNextHour);

    const guildManager = client.guilds;
    const guilds = guildManager.valueOf();
    const promises = guilds.map(postInGuild);
    await Promise.all(promises);
  }
});
