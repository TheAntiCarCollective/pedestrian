import { youtube_v3 } from "@googleapis/youtube";
import PlaylistItemSnippet = youtube_v3.Schema$PlaylistItemSnippet;

import type { Guild } from "discord.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  DiscordAPIError,
  EmbedBuilder,
  Events,
  roleMention,
} from "discord.js";
import loggerFactory from "pino";

import { registerButton } from "../../../services/discord/commands";
import discord, { Color } from "../../../services/discord";
import {
  getChannelUrl,
  getThumbnailUrl,
  getVideoUrl,
} from "../../../services/youtube";
import sleep from "../../../sleep";

import type { CreatorSubscription } from "./database";
import * as localDatabase from "./database";
import * as creatorsDatabase from "../database";
import * as youtube from "../youtube";
import { CreatorType } from "../constants";

const DESCRIPTION_BUTTON_ID_PREFIX = // DO NOT CHANGE
  "GLOBAL_8f75c929-77a9-469c-8662-fec4a8c26a95_";

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

  const post = async (video: PlaylistItemSnippet) => {
    const { publishedAt, resourceId, title } = video;
    const { videoId } = resourceId ?? {};

    // prettier-ignore
    if (typeof publishedAt !== "string" || typeof title !== "string") return false;
    if (typeof videoId !== "string" || videoId === lastContentId) return false;

    const videoDate = new Date(publishedAt);
    if (videoDate < createdAt) return false;

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
      .setLabel("| Click Here for Description |")
      .setStyle(ButtonStyle.Primary)
      .setCustomId(`${DESCRIPTION_BUTTON_ID_PREFIX}${videoId}`);

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

registerButton(DESCRIPTION_BUTTON_ID_PREFIX, async (interaction, videoId) => {
  const video = await youtube.getVideo(videoId);
  const { snippet: videoSnippet, statistics } = video;

  let { description } = videoSnippet ?? {};
  const { channelId, publishedAt, tags, title } = videoSnippet ?? {};

  if (typeof channelId !== "string") throw new Error(videoId);
  const { snippet: channelSnippet } = await youtube.getChannel(channelId);
  const { title: channelName, thumbnails } = channelSnippet ?? {};

  const channelUrl = getChannelUrl(channelId);
  const channelThumbnailUrl = getThumbnailUrl(thumbnails);
  const videoUrl = getVideoUrl(videoId);

  const author =
    typeof channelName === "string"
      ? {
          iconURL: channelThumbnailUrl,
          name: channelName,
          url: channelUrl,
        }
      : null;

  const footer =
    typeof title === "string"
      ? {
          iconURL: channelThumbnailUrl,
          text: title,
        }
      : null;

  const timestamp =
    typeof publishedAt === "string" ? new Date(publishedAt) : null;

  let embed = new EmbedBuilder()
    .setAuthor(author)
    .setColor(Color.INFORMATIONAL)
    .setFooter(footer)
    .setTimestamp(timestamp)
    .setTitle(title ?? null)
    .setURL(videoUrl);

  const source = statistics ?? {};
  const addField = (name: string, property: keyof typeof source) => {
    const rawValue = source[property];
    if (typeof rawValue !== "string") return embed;

    const value = parseInt(rawValue);
    return embed.addFields({
      name,
      value: value.toLocaleString(),
      inline: true,
    });
  };

  embed = addField("Views", "viewCount");
  embed = addField("Likes", "likeCount");
  embed = addField("Dislikes", "dislikeCount");
  embed = addField("Comments", "commentCount");
  embed = addField("Favorites", "favoriteCount");

  const tagsValue = tags?.reduce((tagsValue, tag) => {
    const newTagsValue =
      tagsValue.length > 0 ? `${tagsValue} #${tag}` : `#${tag}`;
    return newTagsValue.length > 1024 ? tagsValue : newTagsValue;
  }, "");

  if (tagsValue !== undefined && tagsValue.length > 0)
    embed = embed.addFields({ name: "Tags", value: tagsValue });

  description ??= "";
  description = description.substring(0, 4096);
  const { length: descriptionLength } = description;
  if (descriptionLength > 0 && descriptionLength + embed.length <= 6000)
    embed = embed.setDescription(description);

  return interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
});
