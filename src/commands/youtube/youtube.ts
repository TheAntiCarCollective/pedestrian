import assert from "node:assert";

import youtube from "../../services/youtube";
import CacheKey, * as cache from "../../cache";
import { isNonNullable } from "../../helpers";

const { channels, playlistItems, search, videos } = youtube;
const ExpireIn30Days = 2_592_000_000;
const ExpireIn30Minutes = 1_800_000;

export const getChannels = (query: string) => {
  const key = CacheKey.channels(query);
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

  return cache.computeIfAbsent(key, callback, ExpireIn30Days);
};

export const getChannel = (channelId: string) => {
  const key = CacheKey.channel(channelId);
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

  return cache.computeIfAbsent(key, callback, ExpireIn30Days);
};

export const getVideos = (playlistId: string) => {
  const key = CacheKey.videos(playlistId);
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

  return cache.computeIfAbsent(key, callback, ExpireIn30Minutes);
};

export const getVideo = (videoId: string) => {
  const key = CacheKey.video(videoId);
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

  return cache.computeIfAbsent(key, callback, ExpireIn30Minutes);
};
