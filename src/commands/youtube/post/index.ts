import assert from "node:assert";

import { getThumbnailUrl, getVideoUrl } from "../../../services/youtube";
import { CreatorType, registerPoster } from "../../../creators";
import { isNonNullable } from "../../../helpers";

import UI from "./ui";
import * as youtube from "../youtube";

registerPoster(
  CreatorType.YouTube,
  async ({ createdAt, lastContentId, creatorDomainId }) => {
    const { contentDetails, snippet } =
      await youtube.getChannel(creatorDomainId);

    const { relatedPlaylists } = contentDetails ?? {};
    const { uploads } = relatedPlaylists ?? {};
    assert(uploads !== undefined);

    const { title: channelName, thumbnails } = snippet ?? {};
    assert(isNonNullable(channelName));

    const videos = await youtube.getVideos(uploads);
    const options = [];

    for (const video of videos) {
      const { publishedAt, resourceId, title } = video;
      assert(isNonNullable(title));

      // Do not post videos created before the subscription was created
      assert(isNonNullable(publishedAt));
      const videoDate = new Date(publishedAt);
      if (videoDate < createdAt) break;
      // Do not post videos created before the last posted video
      const { videoId } = resourceId ?? {};
      assert(isNonNullable(videoId));
      if (videoId === lastContentId) break;

      options.push({
        avatarURL: getThumbnailUrl(thumbnails),
        components: UI.viewDescription(videoId),
        contentId: videoId,
        title,
        url: getVideoUrl(videoId),
        username: channelName,
      });
    }

    // Reverse options so the oldest videos are posted first
    return options.reverse();
  },
);
