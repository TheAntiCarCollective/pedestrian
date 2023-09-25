import type { BaseInteraction } from "discord.js";

import type { Context, PartialContext } from "./database";
import * as database from "./database";

export default class Session<T extends Context> {
  create = (context: PartialContext<T>, { id: sessionId }: BaseInteraction) =>
    database.createSession(sessionId, context);

  read = (sessionId: string) => database.readSession<T>(sessionId);

  update = (context: T, { id: newSessionId }: BaseInteraction) =>
    database.updateSession(newSessionId, context);

  destroy = async (sessionId: string) =>
    void (await database.destroySession(sessionId));
}
