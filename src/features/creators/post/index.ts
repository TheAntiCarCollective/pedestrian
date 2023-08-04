import type { Guild } from "discord.js";
import { bold, DiscordAPIError, Events } from "discord.js";
import { compress } from "compress-tag";

import discord from "../../../services/discord";
import { getThumbnailUrl, getVideoUrl } from "../../../services/youtube";
import sleep from "../../../sleep";

import type { CreatorSubscription } from "./database";
import * as database from "./database";
import * as youtube from "../youtube";
import * as creatorsDatabase from "../database";
import { CreatorType } from "../constants";

const getWebhook = async ({
  creatorChannelId,
  webhookId,
  webhookToken,
}: CreatorSubscription) => {
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

const postFromYouTube = async (creatorSubscription: CreatorSubscription) => {
  const webhook = await getWebhook(creatorSubscription);
  if (webhook === undefined) return;

  const { domainId, lastContentId, creatorChannelId, createdAt } =
    creatorSubscription;

  const { contentDetails, snippet } = await youtube.getChannel(domainId);
  const { relatedPlaylists } = contentDetails ?? {};
  const { uploads } = relatedPlaylists ?? {};
  if (uploads === undefined) return;

  const { title: channelName, thumbnails } = snippet ?? {};
  if (typeof channelName !== "string") return;

  const videos = await youtube.getVideos(uploads);
  const { description, publishedAt, resourceId, title } = videos[0] ?? {};
  const { videoId } = resourceId ?? {};

  if (typeof videoId !== "string" || videoId === lastContentId) return;
  if (typeof publishedAt !== "string" || typeof title !== "string") return;

  const videoDate = new Date(publishedAt);
  if (videoDate < createdAt) return;

  const rawContent = compress`
    ${getVideoUrl(videoId)}
    \n\n${bold("Title")}
    \n${title}
    \n\n${bold("Description")}
    \n${description ?? ""}
  `;

  const content = rawContent.substring(0, 2000);
  const threadName = `${channelName} - ${title}`.substring(0, 100);

  const { id } = await webhook.send({
    avatarURL: getThumbnailUrl(thumbnails),
    content,
    username: channelName,
    threadName,
  });

  await database.createCreatorPost({
    id,
    creatorChannelId,
    domainId,
    creatorType: CreatorType.YOUTUBE,
    contentId: videoId,
  });
};

const postInGuild = async ({ id }: Guild) => {
  const creatorSubscriptions = await database.getCreatorSubscriptions(id);
  const promises = creatorSubscriptions.map((creatorSubscription) => {
    const { creatorType } = creatorSubscription;
    switch (creatorType) {
      case CreatorType.YOUTUBE:
        return postFromYouTube(creatorSubscription);
      default:
        throw new Error(creatorType);
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

    try {
      await Promise.all(promises);
    } catch (error) {
      console.error(error);
    }
  }
});
