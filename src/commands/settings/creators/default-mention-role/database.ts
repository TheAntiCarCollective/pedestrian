import { caller } from "../../../../helpers";
import { useClient } from "../../../../services/postgresql";

// region Types
type DefaultMentionRoleId = {
  defaultMentionRoleId: null | string;
};
// endregion

export const getDefaultMentionRoleId = (guildId: string) =>
  useClient(caller(module, getDefaultMentionRoleId), async (client) => {
    const query = `
      select creator_mention_role_id as "defaultMentionRoleId"
      from guild
      where id = $1
    `;

    const values = [guildId];
    const { rows } = await client.query<DefaultMentionRoleId>(query, values);

    const { defaultMentionRoleId } = rows[0] ?? {};
    return defaultMentionRoleId ?? null;
  });

export const setDefaultMentionRoleId = (
  guildId: string,
  defaultMentionRoleId: null | string,
) =>
  useClient(caller(module, setDefaultMentionRoleId), (client) => {
    const query = `
      update guild
      set creator_mention_role_id = $2
      where id = $1
    `;

    const values = [guildId, defaultMentionRoleId];
    return client.query(query, values);
  });
