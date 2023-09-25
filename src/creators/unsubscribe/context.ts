import Session from "../../session";

import type { CreatorSubscription } from "./database";
import type { CreatorType } from "../constants";

// region Types
export type Context = {
  sessionId: string;
  selectedIndexes: number[];
  creatorType: CreatorType;
  creatorSubscriptions: CreatorSubscription[];
  names: Record<string, string>;
};
// endregion

export default new Session<Context>();
