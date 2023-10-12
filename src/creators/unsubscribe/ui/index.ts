import type { GuildChannelManager } from "discord.js";

import { compress } from "compress-tag";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  bold,
} from "discord.js";
import assert from "node:assert";

import type { CreatorType } from "../../constants";
import type { Context } from "../context";

import { Color } from "../../../shared/discord";

export enum UIID {
  CancelButton = "6abeeb82-31e1-4258-a2db-3471c0922e1a",
  SubscriptionSelect = "81553290-cfc9-4ddc-9d35-b0c4d463f44c",
  UnsubscribeButton = "81bbe978-6c98-43b6-adf6-eddea274864e",
}

// region No Creator Subscriptions
const noCreatorSubscriptionsEmbeds = (creatorType: CreatorType) => {
  const description = compress`
    Your request for unsubscribing has been denied because this server has no
    ${creatorType} subscriptions. Use the following command to subscribe:
    \n${bold(`/${creatorType.toLowerCase()} subscribe`)}
  `;

  const embed = new EmbedBuilder()
    .setColor(Color.Error)
    .setDescription(description);

  return [embed];
};

const noCreatorSubscriptions = (creatorType: CreatorType) => ({
  embeds: noCreatorSubscriptionsEmbeds(creatorType),
  ephemeral: true,
});
// endregion

// region Unsubscribe Menu
// region Components
// region Subscription Select
const subscriptionSelect = (
  { creatorSubscriptions, names, selectedIndexes, sessionId }: Context,
  { cache: channels }: GuildChannelManager,
) => {
  const options = creatorSubscriptions.map(
    ({ creatorChannelId, creatorDomainId }, index) => {
      const channel = channels.get(creatorChannelId);
      const name = names[creatorDomainId];
      assert(name !== undefined);

      return new StringSelectMenuOptionBuilder()
        .setDefault(selectedIndexes.includes(index))
        .setDescription(`#${channel?.name}`)
        .setLabel(name)
        .setValue(`${index}`);
    },
  );

  return new StringSelectMenuBuilder()
    .setCustomId(`${UIID.SubscriptionSelect}${sessionId}`)
    .setMinValues(0)
    .setMaxValues(options.length)
    .setOptions(options);
};

const subscriptionSelectActionRow = (
  context: Context,
  channels: GuildChannelManager,
) =>
  new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
    subscriptionSelect(context, channels),
  );
// endregion

// region Confirm
const unsubscribeButton = ({ selectedIndexes, sessionId }: Context) =>
  new ButtonBuilder()
    .setCustomId(`${UIID.UnsubscribeButton}${sessionId}`)
    .setDisabled(selectedIndexes.length === 0)
    .setEmoji("🗑️")
    .setLabel("| Unsubscribe")
    .setStyle(ButtonStyle.Danger);

const cancelButton = ({ sessionId }: Context) =>
  new ButtonBuilder()
    .setCustomId(`${UIID.CancelButton}${sessionId}`)
    .setEmoji("❌")
    .setLabel("| Cancel")
    .setStyle(ButtonStyle.Secondary);

const confirmActionRow = (context: Context) =>
  new ActionRowBuilder<ButtonBuilder>().setComponents(
    cancelButton(context),
    unsubscribeButton(context),
  );
// endregion

const unsubscribeMenuComponents = (
  context: Context,
  channels: GuildChannelManager,
) => [
  subscriptionSelectActionRow(context, channels),
  confirmActionRow(context),
];
// endregion

const unsubscribeMenuEmbeds = () => {
  const description =
    "Use the select menu to choose the creators to unsubscribe from.";

  const embed = new EmbedBuilder()
    .setColor(Color.Informational)
    .setDescription(description);

  return [embed];
};

const unsubscribeMenu = (context: Context, channels: GuildChannelManager) => ({
  components: unsubscribeMenuComponents(context, channels),
  embeds: unsubscribeMenuEmbeds(),
  ephemeral: true,
});
// endregion

// region Cancelled
const cancelledEmbeds = () => {
  const description = "Successfully cancelled unsubscribing from creators!";

  const embed = new EmbedBuilder()
    .setColor(Color.Warning)
    .setDescription(description);

  return [embed];
};

const cancelled = () => ({
  components: [],
  embeds: cancelledEmbeds(),
});
// endregion

// region Unsubscribed
const unsubscribedEmbeds = ({ selectedIndexes }: Context) => {
  const { length: numberOfDeletedSubscriptions } = selectedIndexes;
  const count = bold(`${numberOfDeletedSubscriptions}`);
  const s = numberOfDeletedSubscriptions === 1 ? "" : "s";

  const description = compress`
    Successfully unsubscribed from ${count} creator${s}! Posts will no longer
    be automatically created with the ${count} selected creator${s} in the
    selected channels.
  `;

  const embed = new EmbedBuilder()
    .setColor(Color.Success)
    .setDescription(description);

  return [embed];
};

const unsubscribed = (context: Context) => ({
  components: [],
  embeds: unsubscribedEmbeds(context),
});
// endregion

export default {
  cancelled,
  noCreatorSubscriptions,
  unsubscribeMenu,
  unsubscribed,
};
