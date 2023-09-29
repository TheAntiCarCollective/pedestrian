import { compress } from "compress-tag";
import { EmbedBuilder, bold, channelMention } from "discord.js";

import type { CreatorType } from "../constants";

import { Color } from "../../services/discord";

// region Max Creator Subscriptions
const maxCreatorSubscriptionsEmbeds = (
  creatorType: CreatorType,
  name: string,
) => {
  const description = compress`
    Your request for subscribing to ${bold(name)} has been denied because this
    server is currently only permitted to have 25 ${creatorType} subscriptions.
    Use the following command to unsubscribe:
    \n${bold(`/${creatorType.toLowerCase()} unsubscribe`)}
  `;

  const embed = new EmbedBuilder()
    .setColor(Color.Error)
    .setDescription(description);

  return [embed];
};

const maxCreatorSubscriptions = (creatorType: CreatorType, name: string) => ({
  embeds: maxCreatorSubscriptionsEmbeds(creatorType, name),
  ephemeral: true,
});
// endregion

// region Subscribed
const subscribedEmbeds = (name: string, channelId: string) => {
  const description = compress`
    Successfully subscribed to ${bold(name)}! Posts will now be automatically
    created in ${channelMention(channelId)} when ${bold(name)} uploads.
    \n\nPlease allow up to an hour for posts to be created after an upload.
  `;

  const embed = new EmbedBuilder()
    .setColor(Color.Success)
    .setDescription(description);

  return [embed];
};

const subscribed = (name: string, channelId: string) => ({
  components: [],
  embeds: subscribedEmbeds(name, channelId),
  ephemeral: true,
});
// endregion

export default {
  maxCreatorSubscriptions,
  subscribed,
};
