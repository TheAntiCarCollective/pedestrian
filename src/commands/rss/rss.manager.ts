import Parser from "rss-parser";

import CacheKey, * as cache from "../../cache";

const parser = new Parser();
const ExpireIn30Minutes = 1_800_000;

export const getFeed = async (url: string) => {
  const key = CacheKey.rssFeed(url);
  const callback = () => parser.parseURL(url);

  return cache.computeIfAbsent(key, callback, ExpireIn30Minutes);
};
