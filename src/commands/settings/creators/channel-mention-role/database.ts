import { caller } from "../../../../helpers";
import { useClient } from "../../../../services/postgresql";

// region Types
type ChannelMentionRoleId = {
  channelMentionRoleId: null | string;
};
// endregion

export const getChannelMentionRoleId = (channelId: string) =>
  useClient(caller(module, getChannelMentionRoleId), async (client) => {
    const query = `
      select creator_mention_role_id as "channelMentionRoleId"
      from creator_channel
      where id = $1
    `;

    const values = [channelId];
    const { rows } = await client.query<ChannelMentionRoleId>(query, values);

    const { channelMentionRoleId } = rows[0] ?? {};
    return channelMentionRoleId ?? null;
  });

export const setChannelMentionRoleId = (
  channelId: string,
  channelMentionRoleId: null | string,
) =>
  useClient(caller(module, setChannelMentionRoleId), (client) => {
    const query = `
      update creator_channel
      set creator_mention_role_id = $2
      where id = $1
    `;

    const values = [channelId, channelMentionRoleId];
    return client.query(query, values);
  });
