import Parser from "rss-parser";

import RedisKey, * as redis from "../../shared/redis";

const parser = new Parser();
const ExpireIn30Minutes = 1_800_000;

export const getFeed = async (url: string) => {
  const key = RedisKey.rssFeed(url);
  const callback = () => parser.parseURL(url);

  return redis.computeIfAbsent(key, callback, ExpireIn30Minutes);
};
