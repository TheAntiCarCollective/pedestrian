import { useClient } from "../../../../services/postgresql";

// region Types
type CreateCreatorChannel = {
  channelId: string;
  guildId: string;
  webhookId: string;
  webhookToken: string;
};
// endregion

export const createCreatorChannel = ({
  channelId,
  guildId,
  webhookId,
  webhookToken,
}: CreateCreatorChannel) =>
  useClient((client) => {
    const query = `
      insert into creator_channel(id, guild_id, webhook_id, webhook_token)
      values($1, $2, $3, $4)
    `;

    const values = [channelId, guildId, webhookId, webhookToken];
    return client.query(query, values);
  });
