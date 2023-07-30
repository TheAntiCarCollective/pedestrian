import postgresql from "../../../../services/postgresql";

// region Types
type Count = {
  count: string;
};

type CreateCreatorChannel = {
  channelId: string;
  guildId: string;
  webhookId: string;
  webhookToken: string;
};
// endregion

export const getCountOfCreatorChannels = async (guildId: string) => {
  const query = `
    select count(*) as count
    from creator_channel
    where guild_id = $1
  `;

  const values = [guildId];
  const { rows } = await postgresql.query<Count>(query, values);
  const { count } = rows[0] ?? {};
  return parseInt(count ?? "0");
};

export const createCreatorChannel = ({
  channelId,
  guildId,
  webhookId,
  webhookToken,
}: CreateCreatorChannel) => {
  const query = `
    insert into creator_channel(id, guild_id, webhook_id, webhook_token)
    values($1, $2, $3, $4)
  `;

  const values = [channelId, guildId, webhookId, webhookToken];
  return postgresql.query(query, values);
};
