import { youtube, youtube_v3 } from "@googleapis/youtube";
import assert from "node:assert";

import Environment from "../../shared/environment";
import { isNonNullable } from "../../shared/nullable";
import RedisKey, * as redis from "../../shared/redis";

import Thumbnail = youtube_v3.Schema$Thumbnail;
import ThumbnailDetails = youtube_v3.Schema$ThumbnailDetails;

// region YouTube
const { channels, playlistItems, search, videos } = youtube({
  auth: Environment.YoutubeApiKey,
  version: "v3",
});

const ExpireIn30Days = 2_592_000_000;
const ExpireIn30Minutes = 1_800_000;

export const getChannels = (query: string) => {
  const key = RedisKey.channels(query);
  const callback = async () => {
    const { data } = await search.list({
      fields:
        "items(snippet(channelId,channelTitle,description,publishedAt,thumbnails,title))",
      maxResults: 50,
      part: ["snippet"],
      q: query,
      type: ["channel"],
    });

    const items = data.items ?? [];

    // prettier-ignore
    return items
      .map(({ snippet }) => snippet)
      .filter(isNonNullable);
  };

  return redis.computeIfAbsent(key, callback, ExpireIn30Days);
};

export const getChannel = (channelId: string) => {
  const key = RedisKey.channel(channelId);
  const callback = async () => {
    const { data } = await channels.list({
      fields:
        "items(contentDetails(relatedPlaylists(uploads)),id,snippet(title,thumbnails))",
      id: [channelId],
      maxResults: 1,
      part: ["contentDetails", "id", "snippet"],
    });

    const items = data.items ?? [];
    const item = items[0];

    assert(item !== undefined);
    return item;
  };

  return redis.computeIfAbsent(key, callback, ExpireIn30Days);
};

export const getVideos = (playlistId: string) => {
  const key = RedisKey.videos(playlistId);
  const callback = async () => {
    const { data } = await playlistItems.list({
      fields: "items(snippet(publishedAt,resourceId,title))",
      maxResults: 50,
      part: ["snippet"],
      playlistId,
    });

    const items = data.items ?? [];

    return items
      .map(({ snippet }) => snippet)
      .filter(isNonNullable)
      .filter(({ resourceId }) => resourceId?.kind === "youtube#video");
  };

  return redis.computeIfAbsent(key, callback, ExpireIn30Minutes);
};

export const getVideo = (videoId: string) => {
  const key = RedisKey.video(videoId);
  const callback = async () => {
    const { data } = await videos.list({
      fields:
        "items(snippet(channelId,description,publishedAt,tags,title),statistics)",
      id: [videoId],
      maxResults: 1,
      part: ["snippet, statistics"],
    });

    const items = data.items ?? [];
    const item = items[0];

    assert(item !== undefined);
    return item;
  };

  return redis.computeIfAbsent(key, callback, ExpireIn30Minutes);
};
// endregion

// region Functions
export const getChannelUrl = (channelId: string) =>
  `https://www.youtube.com/channel/${channelId}`;

export const getThumbnailUrl = (thumbnailDetails: ThumbnailDetails = {}) =>
  Object.values(thumbnailDetails)
    .filter((value) => typeof value === "object")
    .map((value) => value as Thumbnail)
    .sort((a, b) => {
      const aResolution = (a.height ?? 0) * (a.width ?? 0);
      const bResolution = (b.height ?? 0) * (b.width ?? 0);
      return bResolution - aResolution;
    })
    .map(({ url }) => url)
    .find(isNonNullable);

export const getVideoUrl = (videoId: string) =>
  `https://www.youtube.com/watch?v=${videoId}`;
// endregion
