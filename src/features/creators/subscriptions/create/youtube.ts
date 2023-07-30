import youtube from "../../../../services/youtube";
import cache, { CacheKey } from "../../../../cache";

const { search } = youtube;
const EXPIRE_IN_30_DAYS = 2_592_000_000;

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
