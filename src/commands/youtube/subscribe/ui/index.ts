import { compress } from "compress-tag";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  bold,
  channelMention,
} from "discord.js";

import type { Context } from "../context";

import { isNullable } from "../../../../helpers";
import { Color } from "../../../../services/discord";
import { getChannelUrl, getThumbnailUrl } from "../../../../services/youtube";
import * as withContext from "../context";

export enum UIID {
  CancelButton = "b6c8e70c-9da2-4010-ad59-7f80a140bb93",
  NextButton = "2bf4d685-e1f7-4bd5-ac45-029755f65506",
  PreviousButton = "41073005-a293-406e-bc50-e16b83e9c02f",
  SubscribeButton = "388d3371-8c32-4ea7-8a98-f6f0d10deeee",
}

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

const noResultsExist = (name: string) => ({
  embeds: noResultsExistEmbeds(name),
  ephemeral: true,
});
// endregion

// region Youtube Channel
// region Components
// region Page
const previousButton = ({ page, sessionId }: Context) =>
  new ButtonBuilder()
    .setCustomId(`${UIID.PreviousButton}${sessionId}`)
    .setDisabled(page === 1)
    .setEmoji("⏮️")
    .setLabel("| Previous YouTuber")
    .setStyle(ButtonStyle.Primary);

const nextButton = ({ page, sessionId, youtubeChannels }: Context) =>
  new ButtonBuilder()
    .setCustomId(`${UIID.NextButton}${sessionId}`)
    .setDisabled(page === youtubeChannels.length)
    .setEmoji("⏭️")
    .setLabel("| Next YouTuber")
    .setStyle(ButtonStyle.Primary);

const pageActionRow = (context: Context) =>
  new ActionRowBuilder<ButtonBuilder>().setComponents(
    previousButton(context),
    nextButton(context),
  );
// endregion

// region Confirm
const subscribeButton = ({ sessionId }: Context) =>
  new ButtonBuilder()
    .setCustomId(`${UIID.SubscribeButton}${sessionId}`)
    .setEmoji("✅")
    .setLabel(`| Subscribe`)
    .setStyle(ButtonStyle.Success);

const cancelButton = ({ sessionId }: Context) =>
  new ButtonBuilder()
    .setCustomId(`${UIID.CancelButton}${sessionId}`)
    .setEmoji("❌")
    .setLabel("| Cancel")
    .setStyle(ButtonStyle.Secondary);

const confirmActionRow = (context: Context) =>
  new ActionRowBuilder<ButtonBuilder>().setComponents(
    cancelButton(context),
    subscribeButton(context),
  );
// endregion

const youtubeChannelComponents = (context: Context) => [
  pageActionRow(context),
  confirmActionRow(context),
];
// endregion

const youtubeChannelContent = (context: Context) => {
  const { channelId, page, youtubeChannels } = context;
  const { length: numberOfYoutubeChannels } = youtubeChannels;

  return compress`
    Posts will automatically be created in ${channelMention(channelId)}
    whenever ${bold(withContext.getName(context))} uploads.
    \n\nPage ${page} of ${numberOfYoutubeChannels}
  `;
};

const youtubeChannelEmbeds = (context: Context) => {
  const youtubeChannel = withContext.getYoutubeChannel(context);
  let { description } = youtubeChannel;
  const { channelId, publishedAt, thumbnails } = youtubeChannel;

  const channelName = withContext.getName(context);
  const thumbnailUrl = getThumbnailUrl(thumbnails) ?? null;

  const channelUrl = isNullable(channelId) ? null : getChannelUrl(channelId);
  const timestamp = isNullable(publishedAt) ? null : new Date(publishedAt);

  description ??= "";
  description = description.length > 0 ? description : null;

  const author = {
    iconURL: thumbnailUrl ?? undefined,
    name: channelName,
    url: channelUrl ?? undefined,
  };
  const footer = {
    iconURL: thumbnailUrl ?? undefined,
    text: channelName,
  };

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

const youtubeChannel = (context: Context) => ({
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

const cancelled = (context: Context) => ({
  components: [],
  content: "",
  embeds: cancelledEmbeds(context),
});
// endregion

export default {
  cancelled,
  noResultsExist,
  youtubeChannel,
};
