import assert from "node:assert";

import { CreatorType, registerPoster } from "../../creators";
import * as rss from "./rss.manager";

registerPoster(CreatorType.RSS, async (creatorDomainId) => {
  const feed = await rss.getFeed(creatorDomainId);
  const { image, items, title: feedName } = feed;

  // All other properties are optional and cannot be asserted
  // https://www.rssboard.org/rss-specification
  assert(feedName !== undefined);

  const { url: avatarURL } = image ?? {};

  const options = [];
  for (const { guid, link, pubDate, title } of items) {
    if (link === undefined || title === undefined) break;
    const contentId = guid ?? link;

    options.push({
      avatarURL,
      contentId,
      timestamp: pubDate,
      title,
      url: link,
      username: feedName,
    });
  }

  return options;
});
