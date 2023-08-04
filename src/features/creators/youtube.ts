import youtube from "../../services/youtube";
import cache, { CacheKey } from "../../cache";

const { channels, playlistItems, search } = youtube;
const EXPIRE_IN_30_DAYS = 2_592_000_000;
const EXPIRE_IN_30_MINUTES = 1_800_000;

export const getChannels = (query: string) => {
  const key = CacheKey.channels(query);
  const callback = async () => {
    const { data } = await search.list({
      maxResults: 50,
      part: ["snippet"],
      q: query,
      type: ["channel"],
    });

    const items = data.items ?? [];

    return items
      .map(({ snippet }) => snippet)
      .filter((snippet) => snippet !== undefined)
      .map((snippet) => snippet as NonNullable<typeof snippet>);
  };

  return cache.computeIfAbsent(key, callback, EXPIRE_IN_30_DAYS);
};

export const getChannel = (channelId: string) => {
  const key = CacheKey.channel(channelId);
  const callback = async () => {
    const { data } = await channels.list({
      id: [channelId],
      maxResults: 1,
      part: [
        "brandingSettings",
        "contentDetails",
        "contentOwnerDetails",
        "id",
        "localizations",
        "snippet",
        "statistics",
        "status",
        "topicDetails",
      ],
    });

    const items = data.items ?? [];
    const item = items[0];

    if (item !== undefined) return item;
    throw new Error(channelId);
  };

  return cache.computeIfAbsent(key, callback, EXPIRE_IN_30_DAYS);
};

export const getVideos = (playlistId: string) => {
  const key = CacheKey.videos(playlistId);
  const callback = async () => {
    const { data } = await playlistItems.list({
      maxResults: 50,
      part: ["snippet"],
      playlistId,
    });

    const items = data.items ?? [];

    return items
      .map(({ snippet }) => snippet)
      .filter((snippet) => snippet !== undefined)
      .map((snippet) => snippet as NonNullable<typeof snippet>)
      .filter(({ resourceId }) => resourceId?.kind === "youtube#video");
  };

  return cache.computeIfAbsent(key, callback, EXPIRE_IN_30_MINUTES);
};
