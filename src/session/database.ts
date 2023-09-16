import assert from "node:assert";

import { useClient } from "../services/postgresql";

import type { Context, PartialContext } from "./types";

// region Types
type ContextRow<T extends Context> = {
  context: PartialContext<T>;
};
// endregion

export const createSession = <T extends Context>(
  sessionId: string,
  context: PartialContext<T>,
) =>
  useClient(`${__filename}#createSession`, async (client) => {
    const query = `
      insert into session(id, context)
      values($1, $2)
    `;

    const values = [sessionId, context];
    await client.query(query, values);

    return {
      sessionId,
      ...context,
    } as T;
  });

export const readSession = <T extends Context>(sessionId: string) =>
  useClient(`${__filename}#readSession`, async (client) => {
    const query = `
      select context
      from session
      where id = $1
    `;

    const values = [sessionId];
    const { rows } = await client.query<ContextRow<T>>(query, values);

    const { context } = rows[0] ?? {};
    assert(context !== undefined);

    return {
      sessionId,
      ...context,
    } as T;
  });

export const updateSession = <T extends Context>(
  newSessionId: string,
  { sessionId: oldSessionId, ...context }: T,
) =>
  useClient(`${__filename}#updateSession`, async (client) => {
    const query = `
      insert into session(id, previous_id, context)
      values($1, $2, $3)
    `;

    const values = [newSessionId, oldSessionId, context];
    await client.query(query, values);

    return {
      sessionId: newSessionId,
      ...context,
    } as T;
  });

export const destroySession = (sessionId: string) =>
  useClient(`${__filename}#destroySession`, (client) => {
    const query = `
      with recursive initial_session(id, previous_id) as(
        select
          id,
          previous_id
        from session
        where id = $1
        union all
        select
          s.id,
          s.previous_id
        from session as s
        inner join initial_session as "is"
          on "is".previous_id = s.id
      )
      delete from session as s
      using initial_session as "is"
      where s.id = "is".id
    `;

    const values = [sessionId];
    return client.query(query, values);
  });
