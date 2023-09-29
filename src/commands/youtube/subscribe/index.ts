import type { ChatInputCommandInteraction } from "discord.js";

import { CreatorType, checkSubscribeRequirements } from "../../../creators";
import * as youtube from "../youtube";
import session from "./context";
import UI from "./ui";

export enum Option {
  Channel = "channel",
  Name = "name",
}

export default async (interaction: ChatInputCommandInteraction) => {
  const { channelId: defaultChannelId, options } = interaction;
  const name = options.getString(Option.Name, true);

  const response =
    // prettier-ignore
    await checkSubscribeRequirements(interaction, name, CreatorType.YouTube);
  if (response !== undefined) return response;

  const youtubeChannels = await youtube.getChannels(name);
  if (youtubeChannels.length === 0)
    return interaction.reply(UI.noResultsExist(name));

  let { id: channelId } = options.getChannel(Option.Channel) ?? {};
  channelId ??= defaultChannelId;

  const partialContext = {
    channelId,
    name,
    page: 1,
    youtubeChannels,
  };

  const context = await session.create(partialContext, interaction);
  return interaction.reply(UI.youtubeChannel(context));
};
