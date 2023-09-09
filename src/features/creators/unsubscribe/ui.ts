import {
  ActionRowBuilder,
  bold,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  GuildBasedChannel,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { compress } from "compress-tag";
import assert from "node:assert";

import { Color } from "../../../services/discord";

import type { Context } from "./types";
import ComponentId from "./components";

// region No Creator Subscriptions
const noCreatorSubscriptionsEmbeds = () => {
  const description = compress`
    Your request for unsubscribing has been denied because this server
    currently has no creator subscriptions. Use the following command to
    subscribe to a creator:
    \n${bold("/creators subscribe")}
  `;

  const embed = new EmbedBuilder()
    .setColor(Color.Error)
    .setDescription(description);

  return [embed];
};

export const noCreatorSubscriptions = () => ({
  embeds: noCreatorSubscriptionsEmbeds(),
  ephemeral: true,
});
// endregion

// region Unsubscribe Menu
// region Components
// region Index Select
const indexSelect = (
  { sessionId, creatorSubscriptions, creators, selectedIndexes }: Context,
  channels: Map<string, GuildBasedChannel>,
) => {
  const options = creatorSubscriptions.map(
    ({ creatorChannelId, creatorDomainId, creatorType }, index) => {
      const channel = channels.get(creatorChannelId);
      assert(channel !== undefined);

      const creatorDomainIds = creators[creatorType];
      const { snippet } = creatorDomainIds[creatorDomainId] ?? {};
      const { title } = snippet ?? {};

      return new StringSelectMenuOptionBuilder()
        .setDefault(selectedIndexes.includes(index))
        .setDescription(channel.name)
        .setLabel(title ?? creatorDomainId)
        .setValue(`${index}`);
    },
  );

  return new StringSelectMenuBuilder()
    .setCustomId(`${ComponentId.IndexSelect}${sessionId}`)
    .setMinValues(0)
    .setMaxValues(options.length)
    .setOptions(options);
};

const indexSelectActionRow = (
  context: Context,
  channels: Map<string, GuildBasedChannel>,
) =>
  new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
    indexSelect(context, channels),
  );
// endregion

// region Confirm
const applyButton = ({ sessionId, selectedIndexes }: Context) =>
  new ButtonBuilder()
    .setCustomId(`${ComponentId.ApplyButton}${sessionId}`)
    .setDisabled(selectedIndexes.length === 0)
    .setEmoji("🗑️")
    .setLabel("| Unsubscribe")
    .setStyle(ButtonStyle.Danger);

const cancelButton = ({ sessionId }: Context) =>
  new ButtonBuilder()
    .setCustomId(`${ComponentId.CancelButton}${sessionId}`)
    .setEmoji("❌")
    .setLabel("| Cancel")
    .setStyle(ButtonStyle.Secondary);

const confirmActionRow = (context: Context) =>
  new ActionRowBuilder<ButtonBuilder>().setComponents(
    cancelButton(context),
    applyButton(context),
  );
// endregion

const unsubscribeMenuComponents = (
  context: Context,
  channels: Map<string, GuildBasedChannel>,
) => [indexSelectActionRow(context, channels), confirmActionRow(context)];
// endregion

const unsubscribeMenuEmbeds = () => {
  const description =
    "Use the select menu to choose the creators to unsubscribe from.";

  const embed = new EmbedBuilder()
    .setColor(Color.Informational)
    .setDescription(description);

  return [embed];
};

export const unsubscribeMenu = (
  context: Context,
  channels: Map<string, GuildBasedChannel>,
) => ({
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

export const cancelled = () => ({
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

export const unsubscribed = (context: Context) => ({
  components: [],
  embeds: unsubscribedEmbeds(context),
});
// endregion
