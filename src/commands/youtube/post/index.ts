import assert from "node:assert";

import { CreatorType, registerPoster } from "../../../creators";
import { byDate, isNonNullable } from "../../../helpers";
import { getThumbnailUrl, getVideoUrl } from "../../../services/youtube";
import * as youtube from "../youtube.manager";
import UI from "./ui";

registerPoster(
  CreatorType.YouTube,
  async ({ createdAt, creatorDomainId, lastContentId }) => {
    const { contentDetails, snippet } =
      await youtube.getChannel(creatorDomainId);

    const { relatedPlaylists } = contentDetails ?? {};
    const { uploads } = relatedPlaylists ?? {};
    assert(uploads !== undefined);

    const { thumbnails, title: channelName } = snippet ?? {};
    assert(isNonNullable(channelName));

    const videos = await youtube.getVideos(uploads);
    const orderedVideos = videos.sort(
      byDate(({ publishedAt }) => publishedAt, "desc"),
    );

    const options = [];
    for (const video of orderedVideos) {
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
