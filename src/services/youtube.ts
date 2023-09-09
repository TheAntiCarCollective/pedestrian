import { youtube, youtube_v3 } from "@googleapis/youtube";
import Thumbnail = youtube_v3.Schema$Thumbnail;
import ThumbnailDetails = youtube_v3.Schema$ThumbnailDetails;

import Environment from "../environment";
import { isNonNullable } from "../helpers/array";

export const getChannelUrl = (channelId: string) =>
  `https://www.youtube.com/channel/${channelId}`;

export const getThumbnailUrl = (thumbnailDetails: ThumbnailDetails = {}) => {
  const urls = Object.values(thumbnailDetails)
    .filter((value) => typeof value === "object")
    .map((value) => value as Thumbnail)
    .sort((a, b) => {
      const aResolution = (a.height ?? 0) * (a.width ?? 0);
      const bResolution = (b.height ?? 0) * (b.width ?? 0);
      return bResolution - aResolution;
    })
    .map(({ url }) => url)
    .filter(isNonNullable);

  return urls[0];
};

export const getVideoUrl = (videoId: string) =>
  `https://www.youtube.com/watch?v=${videoId}`;

export default youtube({
  auth: Environment.YoutubeApiKey,
  version: "v3",
});
