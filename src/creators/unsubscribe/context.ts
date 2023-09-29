import type { CreatorType } from "../constants";
import type { CreatorSubscription } from "./database";

import Session from "../../session";

// region Types
export type Context = {
  creatorSubscriptions: CreatorSubscription[];
  creatorType: CreatorType;
  names: Record<string, string>;
  selectedIndexes: number[];
  sessionId: string;
};
// endregion

export default new Session<Context>();
