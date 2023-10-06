import assert from "node:assert";

import { CreatorType, registerPoster } from "../../../creators";
import { isNonNullable } from "../../../helpers";
import { getThumbnailUrl, getVideoUrl } from "../../../services/youtube";
import * as youtube from "../youtube.manager";
import UI from "./ui";

registerPoster(CreatorType.YouTube, async (creatorDomainId) => {
  const { contentDetails, snippet } = await youtube.getChannel(creatorDomainId);
  const { thumbnails, title: channelName } = snippet ?? {};
  assert(isNonNullable(channelName));

  const { relatedPlaylists } = contentDetails ?? {};
  const { uploads } = relatedPlaylists ?? {};
  assert(uploads !== undefined);
  const videos = await youtube.getVideos(uploads);

  const options = [];
  for (const video of videos) {
    const { publishedAt, resourceId, title } = video;
    assert(isNonNullable(title));
    const { videoId } = resourceId ?? {};
    assert(isNonNullable(videoId));

    options.push({
      avatarURL: getThumbnailUrl(thumbnails),
      components: UI.viewDescription(videoId),
      contentId: videoId,
      timestamp: publishedAt,
      title,
      url: getVideoUrl(videoId),
      username: channelName,
    });
  }

  return options;
});
