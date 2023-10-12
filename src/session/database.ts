import assert from "node:assert";

import caller from "../shared/caller";
import { useClient } from "../shared/postgresql";

// region Types
export type Context = {
  sessionId: string;
};

export type PartialContext<T extends Context> = Omit<T, "sessionId">;

type ContextRow<T extends Context> = {
  context: PartialContext<T>;
};
// endregion

export const createSession = <T extends Context>(
  sessionId: string,
  context: PartialContext<T>,
) =>
  useClient(caller(module, createSession), (client) => {
    const query = `
      insert into session(id, context)
      values($1, $2)
    `;

    const values = [sessionId, context];
    return client.query(query, values);
  });

export const readSession = <T extends Context>(sessionId: string) =>
  useClient(caller(module, readSession), async (client) => {
    const query = `
      select context
      from session
      where id = $1
    `;

    const values = [sessionId];
    const { rows } = await client.query<ContextRow<T>>(query, values);

    const { context } = rows[0] ?? {};
    assert(context !== undefined);
    return context;
  });

export const updateSession = <T extends Context>(
  newSessionId: string,
  { sessionId: oldSessionId, ...context }: T,
) =>
  useClient(caller(module, updateSession), (client) => {
    const query = `
      insert into session(id, previous_id, context)
      values($1, $2, $3)
    `;

    const values = [newSessionId, oldSessionId, context];
    return client.query(query, values);
  });

export const destroySession = (sessionId: string) =>
  useClient(caller(module, destroySession), (client) => {
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
