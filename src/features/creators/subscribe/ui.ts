import {
  ActionRowBuilder,
  bold,
  ButtonBuilder,
  ButtonStyle,
  channelMention,
  ChannelSelectMenuBuilder,
  EmbedBuilder,
} from "discord.js";
import { compress } from "compress-tag";

import { Color } from "../../../services/discord";
import { getChannelUrl, getThumbnailUrl } from "../../../services/youtube";

import type Context from "./context";
import * as withContext from "./context";
import ComponentId from "./components";
import { SupportedChannelTypes } from "../constants";

// region Max Creator Subscriptions
const maxCreatorSubscriptionsEmbeds = (
  name: string,
  maxCreatorSubscriptions: number,
) => {
  const s = maxCreatorSubscriptions === 1 ? "" : "s";
  const description = compress`
    Your request for subscribing to ${bold(name)} has been denied because this
    server is currently only permitted to have
    ${bold(`${maxCreatorSubscriptions}`)} creator subscription${s}. Use the
    following command to unsubscribe from creators.
    \n${bold("/creators unsubscribe")}
  `;

  const embed = new EmbedBuilder()
    .setColor(Color.Error)
    .setDescription(description);

  return [embed];
};

export const maxCreatorSubscriptions = (
  name: string,
  maxCreatorSubscriptions: number,
) => ({
  embeds: maxCreatorSubscriptionsEmbeds(name, maxCreatorSubscriptions),
  ephemeral: true,
});
// endregion

// region No Results Exist
const noResultsExistEmbeds = (name: string) => {
  const description = compress`
    Your request for subscribing to ${bold(name)} has been denied because no
    results exist for ${bold(name)}. Retry this command with a different name.
  `;

  const embed = new EmbedBuilder()
    .setColor(Color.Error)
    .setDescription(description);

  return [embed];
};

export const noResultsExist = (name: string) => ({
  embeds: noResultsExistEmbeds(name),
  ephemeral: true,
});
// endregion

// region Youtube Channel
// region Components
// region Channel Select
const channelSelect = ({ sessionId, maxNumberOfSelectedChannelIds }: Context) =>
  new ChannelSelectMenuBuilder()
    .setChannelTypes(...SupportedChannelTypes)
    .setCustomId(`${ComponentId.ChannelSelect}${sessionId}`)
    .setMaxValues(maxNumberOfSelectedChannelIds);

const channelSelectActionRow = (context: Context) =>
  new ActionRowBuilder<ChannelSelectMenuBuilder>().setComponents(
    channelSelect(context),
  );
// endregion

// region Page
const previousCreatorButton = ({ sessionId, page }: Context) =>
  new ButtonBuilder()
    .setCustomId(`${ComponentId.PreviousCreatorButton}${sessionId}`)
    .setDisabled(page === 1)
    .setEmoji("⏮️")
    .setLabel("| Previous Creator")
    .setStyle(ButtonStyle.Primary);

const nextCreatorButton = ({ sessionId, youtubeChannels, page }: Context) =>
  new ButtonBuilder()
    .setCustomId(`${ComponentId.NextCreatorButton}${sessionId}`)
    .setDisabled(page === youtubeChannels.length)
    .setEmoji("⏭️")
    .setLabel("| Next Creator")
    .setStyle(ButtonStyle.Primary);

const pageActionRow = (context: Context) =>
  new ActionRowBuilder<ButtonBuilder>().setComponents(
    previousCreatorButton(context),
    nextCreatorButton(context),
  );
// endregion

// region Confirm
const applyButton = ({ sessionId, selectedChannelIds }: Context) =>
  new ButtonBuilder()
    .setCustomId(`${ComponentId.ApplyButton}${sessionId}`)
    .setDisabled(selectedChannelIds.length === 0)
    .setEmoji("✅")
    .setLabel(`| Create Subscriptions`)
    .setStyle(ButtonStyle.Success);

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

const youtubeChannelComponents = (context: Context) => [
  channelSelectActionRow(context),
  pageActionRow(context),
  confirmActionRow(context),
];
// endregion

const youtubeChannelContent = (context: Context) => {
  const { page, youtubeChannels } = context;
  const { length: numberOfYoutubeChannels } = youtubeChannels;

  return compress`
    Posts will automatically be created in the selected channels whenever
    ${bold(withContext.getName(context))} uploads.
    \n\nPage ${page} of ${numberOfYoutubeChannels}
  `;
};

const youtubeChannelEmbeds = (context: Context) => {
  const youtubeChannel = withContext.getYoutubeChannel(context);
  let { description } = youtubeChannel;
  const { channelId, publishedAt, thumbnails } = youtubeChannel;

  const channelName = withContext.getName(context);
  const thumbnailUrl = getThumbnailUrl(thumbnails) ?? null;

  const channelUrl =
    typeof channelId === "string" ? getChannelUrl(channelId) : null;
  const timestamp =
    typeof publishedAt === "string" ? new Date(publishedAt) : null;

  const author = {
    iconURL: thumbnailUrl ?? undefined,
    name: channelName,
    url: channelUrl ?? undefined,
  };

  const footer = {
    iconURL: thumbnailUrl ?? undefined,
    text: channelName,
  };

  description ??= "";
  description = description.length > 0 ? description : null;

  const embed = new EmbedBuilder()
    .setAuthor(author)
    .setColor(Color.Informational)
    .setDescription(description)
    .setFooter(footer)
    .setImage(thumbnailUrl)
    .setThumbnail(thumbnailUrl)
    .setTimestamp(timestamp)
    .setTitle(channelName)
    .setURL(channelUrl);

  return [embed];
};

export const youtubeChannel = (context: Context) => ({
  components: youtubeChannelComponents(context),
  content: youtubeChannelContent(context),
  embeds: youtubeChannelEmbeds(context),
  ephemeral: true,
});
// endregion

// region Cancelled
const cancelledEmbeds = ({ name }: Context) => {
  const description = `Successfully cancelled subscribing to ${bold(name)}!`;

  const embed = new EmbedBuilder()
    .setColor(Color.Warning)
    .setDescription(description);

  return [embed];
};

export const cancelled = (context: Context) => ({
  components: [],
  content: null,
  embeds: cancelledEmbeds(context),
});
// endregion

// region Subscribed
const subscribedEmbeds = (context: Context) => {
  const channelMentions = context.selectedChannelIds
    .map(channelMention)
    .join(", ");

  const youtubeChannelName = withContext.getName(context);
  const description = compress`
    Successfully subscribed to ${bold(youtubeChannelName)}! Posts will now be
    automatically created in ${channelMentions} when
    ${bold(youtubeChannelName)} uploads.
    \n\nPlease allow up to an hour for posts to be created after an upload.
  `;

  const embed = new EmbedBuilder()
    .setColor(Color.Success)
    .setDescription(description);

  return [embed];
};

export const subscribed = (context: Context) => ({
  components: [],
  content: null,
  embeds: subscribedEmbeds(context),
});
// endregion
