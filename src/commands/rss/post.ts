import assert from "node:assert";

import { CreatorType, registerPoster } from "../../creators";
import * as rss from "./rss";

registerPoster(
  CreatorType.RSS,
  // eslint-disable-next-line sonarjs/cognitive-complexity
  async ({ createdAt, creatorDomainId, lastContentId }) => {
    const feed = await rss.getFeed(creatorDomainId);
    const { image, items, title: feedName } = feed;

    // All other properties are optional and cannot be asserted
    // https://www.rssboard.org/rss-specification
    assert(feedName !== undefined);
    const { url: avatarURL } = image ?? {};

    const options = [];
    for (const [index, { link, pubDate, title }] of items.entries()) {
      if (title === undefined) break;
      // Do not post items created before the last posted item
      if (link === undefined || link === lastContentId) break;

      if (pubDate === undefined) {
        // If no item has been posted yet then only post the 1st one
        if (lastContentId === null && index > 0) break;
      } else {
        // Do not post items created before the subscription was created
        const itemDate = new Date(pubDate);
        if (itemDate < createdAt) break;
      }

      options.push({
        avatarURL,
        contentId: link,
        title,
        url: link,
        username: feedName,
      });
    }

    // Reverse options so the oldest items are posted first
    return options.reverse();
  },
);
