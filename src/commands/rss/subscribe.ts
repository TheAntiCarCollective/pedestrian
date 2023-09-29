import type { ChatInputCommandInteraction } from "discord.js";

import assert from "node:assert";

import {
  CreatorType,
  checkSubscribeRequirements,
  subscribe,
} from "../../creators";
import * as rss from "./rss";

export enum Option {
  Channel = "channel",
  URL = "url",
}

export default async (interaction: ChatInputCommandInteraction) => {
  const { channelId: defaultChannelId, options } = interaction;
  const url = options.getString(Option.URL, true);

  const response =
    // prettier-ignore
    await checkSubscribeRequirements(interaction, url, CreatorType.RSS);
  if (response !== undefined) return response;

  const { title } = await rss.getFeed(url);
  assert(title !== undefined);

  let { id: channelId } = options.getChannel(Option.Channel) ?? {};
  channelId ??= defaultChannelId;

  return subscribe({
    channelId,
    creatorDomainId: url,
    creatorType: CreatorType.RSS,
    interaction,
    name: title,
  });
};
