import type { BaseInteraction } from "discord.js";

import type { Context, PartialContext } from "./database";
import * as database from "./database";

export const create = <T extends Context>(
  context: PartialContext<T>,
  { id: sessionId }: BaseInteraction,
) => database.createSession(sessionId, context);

export const read = <T extends Context>(sessionId: string) =>
  database.readSession<T>(sessionId);

export const update = <T extends Context>(
  context: T,
  { id: newSessionId }: BaseInteraction,
) => database.updateSession(newSessionId, context);

export const destroy = async (sessionId: string) =>
  void (await database.destroySession(sessionId));
