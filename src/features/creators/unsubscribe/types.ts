import { youtube_v3 } from "@googleapis/youtube";
import YoutubeChannel = youtube_v3.Schema$Channel;

import type { CreatorType } from "../constants";

export type CreatorSubscription = {
  id: number;
  creatorChannelId: string;
  creatorDomainId: string;
  creatorType: CreatorType;
};

export type Creators = {
  [CreatorType.YouTube]: Record<string, YoutubeChannel>;
};

export type Context = {
  sessionId: string;
  creatorSubscriptions: CreatorSubscription[];
  creators: Creators;
  selectedIndexes: number[];
};
