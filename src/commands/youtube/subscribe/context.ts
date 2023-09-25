import { youtube_v3 } from "@googleapis/youtube";
import YoutubeChannel = youtube_v3.Schema$SearchResultSnippet;

import Session from "../../../session";

// region Types
export type Context = {
  sessionId: string;
  name: string;
  channelId: string;
  youtubeChannels: YoutubeChannel[];
  page: number;
};
// endregion

export const getYoutubeChannel = ({ youtubeChannels, page }: Context) =>
  youtubeChannels[page - 1] ?? {};

export const getName = (context: Context) => {
  const { channelTitle, title } = getYoutubeChannel(context);
  return channelTitle ?? title ?? context.name;
};

export default new Session<Context>();
