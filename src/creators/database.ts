import { useClient } from "../services/postgresql";

export const deleteCreatorChannels = (creatorChannelIds: string[]) =>
  useClient(`${__filename}#deleteCreatorChannels`, (client) => {
    const query = `
      delete from creator_channel
      where id = any($1)
    `;

    const values = [creatorChannelIds];
    return client.query(query, values);
  });