import { youtube_v3 } from "@googleapis/youtube";
import YoutubeChannel = youtube_v3.Schema$Channel;
import YoutubeVideo = youtube_v3.Schema$Video;

import { EmbedBuilder } from "discord.js";
import assert from "node:assert";

import {
  getChannelUrl,
  getThumbnailUrl,
  getVideoUrl,
} from "../../../services/youtube";
import { Color } from "../../../services/discord";

// region YouTube Description
const youtubeDescriptionEmbeds = (
  videoId: string,
  { snippet: videoSnippet, statistics }: YoutubeVideo,
  { snippet: channelSnippet }: YoutubeChannel,
) => {
  const { channelId, publishedAt, tags, title } = videoSnippet ?? {};
  assert(typeof channelId === "string");
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
    .setColor(Color.Informational)
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

  const tagsValue = tags?.reduce((string, tag) => {
    const newTagsValue = string === "" ? `#${tag}` : `${string} #${tag}`;
    return newTagsValue.length > 1024 ? string : newTagsValue;
  }, "");

  if (tagsValue !== undefined && tagsValue !== "")
    embed = embed.addFields({ name: "Tags", value: tagsValue });

  let { description } = videoSnippet ?? {};
  description ??= "";
  description = description.substring(0, 4096);

  const { length } = description;
  if (length > 0 && length + embed.length <= 6000)
    embed = embed.setDescription(description);

  return [embed];
};

export const youtubeDescription = (
  videoId: string,
  video: YoutubeVideo,
  channel: YoutubeChannel,
) => ({
  embeds: youtubeDescriptionEmbeds(videoId, video, channel),
  ephemeral: true,
});
// endregion
