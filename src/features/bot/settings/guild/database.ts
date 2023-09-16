import { useClient } from "../../../../services/postgresql";

import type { GuildSettings } from "./types";

export const getOrCreateGuildSettings = (guildId: string) =>
  useClient((client) => {
    const guildSettings = async (): Promise<GuildSettings> => {
      const query = `
        with guild_settings as(
          insert into guild(id)
          values($1)
          on conflict do nothing
          returning
            id,
            max_creator_subscriptions,
            creator_mention_role_id,
            survey_creator_role_id
        )
        select
          id,
          max_creator_subscriptions as "maxCreatorSubscriptions",
          creator_mention_role_id as "creatorMentionRoleId",
          survey_creator_role_id as "surveyCreatorRoleId"
        from guild_settings
        union all
        select
          id,
          max_creator_subscriptions as "maxCreatorSubscriptions",
          creator_mention_role_id as "creatorMentionRoleId",
          survey_creator_role_id as "surveyCreatorRoleId"
        from guild
        where id = $1
        limit 1
      `;

      const values = [guildId];
      const { rows } = await client.query<GuildSettings>(query, values);

      const row = rows[0];
      // https://stackoverflow.com/a/15950324/5302085
      // "Or loop until you actually get a row. The loop will hardly ever be
      // triggered in common work loads anyway."
      return row ?? guildSettings();
    };

    return guildSettings();
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
