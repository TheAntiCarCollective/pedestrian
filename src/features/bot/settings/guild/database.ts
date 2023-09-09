import assert from "node:assert";

import { useClient, useTransaction } from "../../../../services/postgresql";

import type { GuildSettings } from "./types";

export const getOrCreateGuildSettings = (guildId: string) =>
  useTransaction(async (client) => {
    const query = `
      select
        id,
        max_creator_subscriptions as "maxCreatorSubscriptions",
        creator_mention_role_id as "creatorMentionRoleId",
        survey_creator_role_id as "surveyCreatorRoleId"
      from guild
      where id = $1
    `;

    const values = [guildId];
    const { rows } = await client.query<GuildSettings>(query, values);
    let guildSettings = rows[0];

    if (guildSettings === undefined) {
      const query = `
        insert into guild(id)
        values($1)
        returning
          id,
          max_creator_subscriptions as "maxCreatorSubscriptions",
          creator_mention_role_id as "creatorMentionRoleId",
          survey_creator_role_id as "surveyCreatorRoleId"
      `;

      const { rows } = await client.query<GuildSettings>(query, values);
      guildSettings = rows[0];
    }

    assert(guildSettings !== undefined);
    return guildSettings;
  });

export const setGuildSettings = ({
  id,
  maxCreatorSubscriptions,
  creatorMentionRoleId,
  surveyCreatorRoleId,
}: GuildSettings) =>
  useClient((client) => {
    const query = `
      update guild
      set
        max_creator_subscriptions = $2,
        creator_mention_role_id = $3,
        survey_creator_role_id = $4
      where id = $1
    `;

    return client.query(query, [
      id,
      maxCreatorSubscriptions,
      creatorMentionRoleId,
      surveyCreatorRoleId,
    ]);
  });
