import { youtube_v3 } from "@googleapis/youtube";
import YoutubeChannel = youtube_v3.Schema$SearchResultSnippet;

// region Types
type Context = {
  sessionId: string;
  name: string;
  youtubeChannels: YoutubeChannel[];
  page: number;
  selectedChannelIds: string[];
  maxNumberOfSelectedChannelIds: number;
};
// endregion

export const getYoutubeChannel = ({ youtubeChannels, page }: Context) =>
  youtubeChannels[page - 1] ?? {};

export const getName = (context: Context) => {
  const { channelTitle, title } = getYoutubeChannel(context);
  return channelTitle ?? title ?? context.name;
};

export default Context;
