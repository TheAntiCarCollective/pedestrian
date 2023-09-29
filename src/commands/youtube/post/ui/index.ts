import { youtube_v3 } from "@googleapis/youtube";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import assert from "node:assert";

import { isNonNullable, isNullable } from "../../../../helpers";
import { Color } from "../../../../services/discord";
import {
  getChannelUrl,
  getThumbnailUrl,
  getVideoUrl,
} from "../../../../services/youtube";

import Channel = youtube_v3.Schema$Channel;
import Video = youtube_v3.Schema$Video;
import VideoStatistics = youtube_v3.Schema$VideoStatistics;

export enum UIID {
  DescriptionButton = "8f75c929-77a9-469c-8662-fec4a8c26a95",
}

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

const viewDescription = (videoId: string) => [
  viewDescriptionActionRow(videoId),
];
// endregion

// region Description
const addFields = (embed: EmbedBuilder, statistics: VideoStatistics = {}) => {
  const addField = (name: string, property: keyof typeof statistics) => {
    const rawValue = statistics[property];
    if (isNullable(rawValue)) return embed;

    const value = Number.parseInt(rawValue);
    return embed.addFields({
      inline: true,
      name,
      value: value.toLocaleString(),
    });
  };

  embed = addField("Views", "viewCount");
  embed = addField("Likes", "likeCount");
  embed = addField("Dislikes", "dislikeCount");
  embed = addField("Comments", "commentCount");
  embed = addField("Favorites", "favoriteCount");
  return embed;
};

const addTags = (embed: EmbedBuilder, tags: string[]) => {
  let tagsValue = "";

  for (const tag of tags) {
    const newTagsValue = tagsValue === "" ? `#${tag}` : `${tagsValue} #${tag}`;
    tagsValue = newTagsValue.length > 1024 ? tagsValue : newTagsValue;
  }

  if (tagsValue === "") return embed;
  return embed.addFields({ name: "Tags", value: tagsValue });
};

const descriptionEmbeds = (
  videoId: string,
  { snippet: videoSnippet, statistics }: Video,
  { snippet: channelSnippet }: Channel,
) => {
  const { channelId, publishedAt, tags } = videoSnippet ?? {};
  assert(isNonNullable(channelId));
  const { thumbnails, title: channelName } = channelSnippet ?? {};

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

  embed = addFields(embed, statistics);
  embed = addTags(embed, tags ?? []);

  let { description } = videoSnippet ?? {};
  description ??= "";
  description = description.slice(0, 4096);

  const { length } = description;
  if (length > 0 && length + embed.length <= 6000)
    embed = embed.setDescription(description);

  return [embed];
};

const description = (videoId: string, video: Video, channel: Channel) => ({
  embeds: descriptionEmbeds(videoId, video, channel),
  ephemeral: true,
});
// endregion

export default {
  description,
  viewDescription,
};
