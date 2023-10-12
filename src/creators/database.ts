import caller from "../shared/caller";
import { useClient } from "../shared/postgresql";

export const deleteCreatorChannels = (creatorChannelIds: string[]) =>
  useClient(caller(module, deleteCreatorChannels), (client) => {
    const query = `
      delete from creator_channel
      where id = any($1)
    `;

    const values = [creatorChannelIds];
    return client.query(query, values);
  });
