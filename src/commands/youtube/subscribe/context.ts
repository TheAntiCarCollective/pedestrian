import { youtube_v3 } from "@googleapis/youtube";

import Session from "../../../session";

import YoutubeChannel = youtube_v3.Schema$SearchResultSnippet;

// region Types
export type Context = {
  channelId: string;
  name: string;
  page: number;
  sessionId: string;
  youtubeChannels: YoutubeChannel[];
};
// endregion

export const getYoutubeChannel = ({ page, youtubeChannels }: Context) =>
  youtubeChannels[page - 1] ?? {};

export const getName = (context: Context) => {
  const { channelTitle, title } = getYoutubeChannel(context);
  return channelTitle ?? title ?? context.name;
};

export default new Session<Context>();
