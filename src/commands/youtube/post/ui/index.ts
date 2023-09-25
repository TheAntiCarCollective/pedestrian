import { youtube_v3 } from "@googleapis/youtube";
import YoutubeChannel = youtube_v3.Schema$Channel;
import YoutubeVideo = youtube_v3.Schema$Video;

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import assert from "node:assert";

import {
  getChannelUrl,
  getThumbnailUrl,
  getVideoUrl,
} from "../../../../services/youtube";
import { Color } from "../../../../services/discord";
import { isNonNullable, isNullable } from "../../../../helpers";

import { UIID } from "./constants";

// region View Description
const viewDescriptionButton = (videoId: string) =>
  new ButtonBuilder()
    .setEmoji("📰")
    .setLabel("| View Description")
    .setStyle(ButtonStyle.Primary)
    .setCustomId(`${UIID.DescriptionButton}${videoId}`);

const viewDescriptionActionRow = (videoId: string) =>
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    viewDescriptionButton(videoId),
  );

export const viewDescription = (videoId: string) => [
  viewDescriptionActionRow(videoId),
];
// endregion

// region Description
const descriptionEmbeds = (
  videoId: string,
  { snippet: videoSnippet, statistics }: YoutubeVideo,
  { snippet: channelSnippet }: YoutubeChannel,
) => {
  const { channelId, publishedAt, tags } = videoSnippet ?? {};
  assert(isNonNullable(channelId));
  const { title: channelName, thumbnails } = channelSnippet ?? {};

  const channelUrl = getChannelUrl(channelId);
  const channelThumbnailUrl = getThumbnailUrl(thumbnails);
  const videoUrl = getVideoUrl(videoId);

  let { title } = videoSnippet ?? {};
  title ??= null;

  const timestamp = isNullable(publishedAt) ? null : new Date(publishedAt);

  const author = isNullable(channelName)
    ? null
    : {
        iconURL: channelThumbnailUrl,
        name: channelName,
        url: channelUrl,
      };
  const footer = isNullable(title)
    ? null
    : {
        iconURL: channelThumbnailUrl,
        text: title,
      };

  let embed = new EmbedBuilder()
    .setAuthor(author)
    .setColor(Color.Informational)
    .setFooter(footer)
    .setTimestamp(timestamp)
    .setTitle(title)
    .setURL(videoUrl);

  const source = statistics ?? {};
  const addField = (name: string, property: keyof typeof source) => {
    const rawValue = source[property];
    if (isNullable(rawValue)) return embed;

    const value = Number.parseInt(rawValue);
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

  const tagsValue = tags?.reduce((string, tag) => {
    const newTagsValue = string === "" ? `#${tag}` : `${string} #${tag}`;
    return newTagsValue.length > 1024 ? string : newTagsValue;
  }, "");

  if (tagsValue !== undefined && tagsValue !== "")
    embed = embed.addFields({ name: "Tags", value: tagsValue });

  let { description } = videoSnippet ?? {};
  description ??= "";
  description = description.slice(0, 4096);

  const { length } = description;
  if (length > 0 && length + embed.length <= 6000)
    embed = embed.setDescription(description);

  return [embed];
};

export const description = (
  videoId: string,
  video: YoutubeVideo,
  channel: YoutubeChannel,
) => ({
  embeds: descriptionEmbeds(videoId, video, channel),
  ephemeral: true,
});
// endregion
