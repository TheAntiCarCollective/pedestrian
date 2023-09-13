import type { ChatInputCommandInteraction } from "discord.js";
import assert from "node:assert";

import * as session from "../../../session";
import guildSettings from "../../bot/settings/guild";

import type Context from "./context";
import * as database from "./database";
import * as ui from "./ui";
import * as youtube from "../youtube";
import { getChannels } from "../function";

export enum Option {
  Name = "name",
}

export default async (interaction: ChatInputCommandInteraction) => {
  const { guild, options } = interaction;
  assert(guild !== null);
  const { id: guildId, channels: guildChannelManager } = guild;

  let creatorSubscriptions = await database.getCreatorSubscriptions(guildId);
  const channels = await getChannels(creatorSubscriptions, guildChannelManager);

  // prettier-ignore
  creatorSubscriptions = creatorSubscriptions
    .filter(({ creatorChannelId }) => channels.has(creatorChannelId));

  const creatorSubscriptionsCount = creatorSubscriptions.length;
  const { maxCreatorSubscriptions } = await guildSettings(guildId);

  const name = options.getString(Option.Name, true);

  if (creatorSubscriptionsCount >= maxCreatorSubscriptions) {
    return interaction.reply(
      ui.maxCreatorSubscriptions(name, maxCreatorSubscriptions),
    );
  }

  const youtubeChannels = await youtube.getChannels(name);
  const { length: maxPage } = youtubeChannels;
  if (maxPage === 0) return interaction.reply(ui.noResultsExist(name));

  const maxNumberOfSelectedChannelIds =
    maxCreatorSubscriptions - creatorSubscriptionsCount;

  const partialContext = {
    name,
    youtubeChannels,
    page: 1,
    selectedChannelIds: [],
    maxNumberOfSelectedChannelIds,
  };

  const context = await session.create<Context>(partialContext, interaction);
  return interaction.reply(ui.youtubeChannel(context));
};
