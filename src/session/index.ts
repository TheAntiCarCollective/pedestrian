import type { BaseInteraction } from "discord.js";

import type { Context, PartialContext } from "./database";

import * as database from "./database";

export default class Session<T extends Context> {
  async create(context: PartialContext<T>, { id: sessionId }: BaseInteraction) {
    await database.createSession(sessionId, context);
    return { ...context, sessionId };
  }

  async destroy(sessionId: string) {
    await database.destroySession(sessionId);
  }

  async read(sessionId: string) {
    const context = await database.readSession<T>(sessionId);
    return { ...context, sessionId };
  }

  async update(context: T, { id: newSessionId }: BaseInteraction) {
    await database.updateSession(newSessionId, context);
    return { ...context, sessionId: newSessionId };
  }
}
