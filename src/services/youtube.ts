import { google, youtube_v3 } from "googleapis";
import Thumbnail = youtube_v3.Schema$Thumbnail;
import ThumbnailDetails = youtube_v3.Schema$ThumbnailDetails;

import Environment from "../environment";

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
    .filter((url) => typeof url === "string")
    .map((url) => url as NonNullable<typeof url>);

  return urls[0];
};

export const getVideoUrl = (videoId: string) =>
  `https://www.youtube.com/watch?v=${videoId}`;

export default google.youtube({
  auth: Environment.YOUTUBE_API_KEY,
  version: "v3",
});
