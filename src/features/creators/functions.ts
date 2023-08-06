import type { GuildChannelManager } from "discord.js";
import { ChannelType, DiscordAPIError } from "discord.js";
import loggerFactory from "pino";

import { JsonError } from "../../services/discord";

import * as database from "./database";

const logger = loggerFactory({
  name: __filename,
});

export const getCreatorChannels = async (
  guildChannelManager: GuildChannelManager,
  creatorChannelIds: string[],
) => {
  const creatorChannelPromises = creatorChannelIds.map(
    // Delete from database if channel does not exist
    async (creatorChannelId) => {
      try {
        const channel = await guildChannelManager.fetch(creatorChannelId);
        if (channel === null) throw new Error(creatorChannelId);
        if (channel.type === ChannelType.GuildForum) return channel;
        throw new JsonError(channel);
      } catch (error) {
        if (error instanceof DiscordAPIError && error.status === 404) {
          logger.info(error, "GET_CREATOR_CHANNELS_ERROR");
          await database.deleteCreatorChannel(creatorChannelId);
          return undefined;
        }

        throw error;
      }
    },
  );

  const creatorChannels = await Promise.all(creatorChannelPromises);
  return creatorChannels
    .filter((channel) => channel !== undefined)
    .map((channel) => channel as NonNullable<typeof channel>);
};
