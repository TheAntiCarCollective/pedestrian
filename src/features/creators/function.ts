import type { GuildBasedChannel, GuildChannelManager } from "discord.js";
import { DiscordAPIError } from "discord.js";
import loggerFactory from "pino";
import assert from "node:assert";

import * as database from "./database";

const logger = loggerFactory({
  name: __filename,
});

// region Type
type CreatorSubscription = {
  creatorChannelId: string;
};
// endregion

export const getChannels = async (
  creatorSubscriptions: CreatorSubscription[],
  guildChannelManager: GuildChannelManager,
) => {
  const channelIdsRaw = creatorSubscriptions
    .map(({ creatorChannelId }) => creatorChannelId)
    .reduce((set, id) => set.add(id), new Set<string>());
  const channelIds = [...channelIdsRaw];

  const deletedCreatorChannelIds: string[] = [];
  const channelPromises = channelIds.map(async (channelId) => {
    try {
      const channel = await guildChannelManager.fetch(channelId);
      assert(channel !== null);
      return channel;
    } catch (error) {
      if (error instanceof DiscordAPIError && error.status === 404) {
        logger.info(error, "GET_CHANNELS_ERROR");
        deletedCreatorChannelIds.push(channelId);
        return undefined;
      }

      throw error;
    }
  });

  const channelsRaw = await Promise.all(channelPromises);

  if (deletedCreatorChannelIds.length > 0)
    await database.deleteCreatorChannels(deletedCreatorChannelIds);

  return channelsRaw.reduce(
    // prettier-ignore
    (map, channel) => channel === undefined ? map : map.set(channel.id, channel),
    new Map<string, GuildBasedChannel>(),
  );
};
