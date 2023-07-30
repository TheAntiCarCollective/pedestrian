import postgresql from "../../services/postgresql";

export const deleteCreatorChannel = (channelId: string) => {
  const query = `
    delete from creator_channel
    where id = $1
  `;

  const values = [channelId];
  return postgresql.query(query, values);
};
