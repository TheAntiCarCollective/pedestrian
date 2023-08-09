import { youtube_v3 } from "@googleapis/youtube";
import YoutubeChannel = youtube_v3.Schema$SearchResultSnippet;

import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
} from "discord.js";
import {
  ActionRowBuilder,
  bold,
  ButtonBuilder,
  ButtonStyle,
  channelMention,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { compress } from "compress-tag";
import { v4 as uuid } from "uuid";
import loggerFactory from "pino";

import { Color, JsonError } from "../../../../services/discord";
import { getChannelUrl, getThumbnailUrl } from "../../../../services/youtube";
import guildSettings from "../../../bot/settings/guild";

import * as database from "./database";
import { getCreatorChannels } from "../../functions";
import { CreatorType } from "../../constants";
import * as youtube from "../../youtube";

const logger = loggerFactory({
  name: __filename,
});

export enum Option {
  NAME = "name",
}

const getEmbedByYoutubeChannel = ({
  channelId,
  channelTitle,
  description,
  publishedAt,
  thumbnails,
  title,
}: YoutubeChannel = {}) => {
  const channelName = channelTitle ?? title ?? null;
  const thumbnailUrl = getThumbnailUrl(thumbnails) ?? null;

  const channelUrl =
    typeof channelId === "string" ? getChannelUrl(channelId) : null;
  const timestamp =
    typeof publishedAt === "string" ? new Date(publishedAt) : null;

  const author =
    channelName === null
      ? null
      : {
          iconUrl: thumbnailUrl,
          name: channelName,
          url: channelUrl ?? undefined,
        };

  const footer =
    channelName === null
      ? null
      : {
          iconUrl: thumbnailUrl,
          text: channelName,
        };

  description ??= "";
  description = description.length > 0 ? description : null;

  return new EmbedBuilder()
    .setAuthor(author)
    .setColor(Color.INFORMATIONAL)
    .setDescription(description)
    .setFooter(footer)
    .setImage(thumbnailUrl)
    .setThumbnail(thumbnailUrl)
    .setTimestamp(timestamp)
    .setTitle(channelName)
    .setURL(channelUrl);
};

export default async (interaction: ChatInputCommandInteraction) => {
  const { guild, options } = interaction;
  if (guild === null) throw new JsonError(interaction);

  const guildChannelManager = guild.channels;
  const guildId = guild.id;

  const settingsPromise = guildSettings(guildId);
  const creatorChannelsPromise = database.getCreatorChannels(guildId);
  const { maxCreatorSubscriptions } = await settingsPromise;
  const creatorChannels = await creatorChannelsPromise;

  const channelIds = creatorChannels
    .filter((id) => id.creatorSubscriptionCount < maxCreatorSubscriptions)
    .map(({ id }) => id);

  const channels = await getCreatorChannels(guildChannelManager, channelIds);

  if (channels.length === 0) {
    const description = compress`
      Your request for creating a creator subscription has been denied because
      this server currently has no creator channels ${bold("or")} no creator
      channels exist with less than ${maxCreatorSubscriptions} creator
      subscriptions. Use the following command to create a creator channel:
      \n${bold("/creators channels create")}
    `;

    const embed = new EmbedBuilder()
      .setColor(Color.ERROR)
      .setDescription(description);

    return interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  }

  const name = options.getString(Option.NAME);
  if (name === null) throw new JsonError(interaction);

  const noResultsExistOptions = <T>(content: T) => {
    const description = compress`
      Your request for creating a creator subscription has been denied because
      no results exist for ${bold(name)}. Retry this command with a different
      ${Option.NAME} value.
    `;

    const embed = new EmbedBuilder()
      .setColor(Color.ERROR)
      .setDescription(description);

    return {
      components: [],
      content,
      embeds: [embed],
      ephemeral: true,
    };
  };

  const youtubeChannels = await youtube.getChannels(name);
  const maxPage = youtubeChannels.length;
  if (maxPage === 0) return interaction.reply(noResultsExistOptions(undefined));

  const selectMenuId = uuid();
  const previousButtonId = uuid();
  const nextButtonId = uuid();
  const applyButtonId = uuid();
  const cancelButtonId = uuid();

  const { id: defaultCreatorChannelId } = channels[0] ?? {};
  if (defaultCreatorChannelId === undefined) throw new JsonError(interaction);

  let selectedCreatorChannelIds: string[] =
    channels.length === 1 ? [defaultCreatorChannelId] : [];
  let selectedYoutubeChannel: YoutubeChannel | undefined;
  let page = 1;

  const youtubeChannelOptions = () => {
    selectedYoutubeChannel = youtubeChannels[page - 1];
    const embed = getEmbedByYoutubeChannel(selectedYoutubeChannel);
    const { channelTitle, title } = selectedYoutubeChannel ?? {};
    const youtubeChannelName = channelTitle ?? title ?? name;

    const applyButtonLabel = `I want to create a subscription for ${youtubeChannelName}`;
    // prettier-ignore
    const cancelButtonLabel = "None of these creators is the one I am searching for";

    const content = compress`
      Posts will automatically be created in the selected creator channels
      whenever ${bold(youtubeChannelName)} uploads.
      \n\nPage ${page} of ${maxPage}
    `;

    const selectMenuOptions = channels.map(({ id, name }) =>
      new StringSelectMenuOptionBuilder()
        .setDefault(selectedCreatorChannelIds.includes(id))
        .setLabel(name)
        .setValue(id),
    );

    const selectMenu = new StringSelectMenuBuilder()
      .addOptions(selectMenuOptions)
      .setCustomId(selectMenuId)
      .setMaxValues(selectMenuOptions.length);

    const previousButton = new ButtonBuilder()
      .setCustomId(previousButtonId)
      .setDisabled(page === 1)
      .setLabel("Previous")
      .setStyle(ButtonStyle.Primary);

    const nextButton = new ButtonBuilder()
      .setCustomId(nextButtonId)
      .setDisabled(page === maxPage)
      .setLabel("Next")
      .setStyle(ButtonStyle.Primary);

    const applyButton = new ButtonBuilder()
      .setCustomId(applyButtonId)
      .setDisabled(selectedCreatorChannelIds.length === 0)
      .setLabel(applyButtonLabel)
      .setStyle(ButtonStyle.Success);

    const cancelButton = new ButtonBuilder()
      .setCustomId(cancelButtonId)
      .setLabel(cancelButtonLabel)
      .setStyle(ButtonStyle.Secondary);

    const selectMenuActionRow =
      // prettier-ignore
      new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(selectMenu);
    const pageActionRow =
      // prettier-ignore
      new ActionRowBuilder<ButtonBuilder>()
        .addComponents(previousButton, nextButton);
    const applyActionRow =
      // prettier-ignore
      new ActionRowBuilder<ButtonBuilder>()
        .addComponents(applyButton);
    const cancelActionRow =
      // prettier-ignore
      new ActionRowBuilder<ButtonBuilder>()
        .addComponents(cancelButton);

    const components = [
      selectMenuActionRow,
      pageActionRow,
      applyActionRow,
      cancelActionRow,
    ];

    return {
      components,
      content,
      embeds: [embed],
      ephemeral: true,
    };
  };

  let response = await interaction.reply(youtubeChannelOptions());
  let buttonInteraction: ButtonInteraction;

  try {
    const interaction = await response.awaitMessageComponent({
      filter: async (interaction) => {
        switch (interaction.customId) {
          case selectMenuId:
            if (!interaction.isStringSelectMenu())
              throw new JsonError(interaction);
            selectedCreatorChannelIds = interaction.values;
            break;
          case previousButtonId:
            page -= 1;
            break;
          case nextButtonId:
            page += 1;
            break;
          case applyButtonId:
          case cancelButtonId:
            return true;
          default:
            throw new JsonError(interaction);
        }

        response = await interaction.update(youtubeChannelOptions());
        return false;
      },
      time: 600_000, // 10 minutes
    });

    if (!interaction.isButton()) throw new JsonError(interaction);
    buttonInteraction = interaction;
  } catch (error) {
    logger.info(error, "NO_CREATOR_CHANNEL_IDS_SELECTED");
    await response.delete();
    return response;
  }

  const buttonId = buttonInteraction.customId;
  const youtubeChannelId = selectedYoutubeChannel?.channelId;

  if (buttonId === cancelButtonId || typeof youtubeChannelId !== "string")
    return buttonInteraction.update(noResultsExistOptions(null));

  await database.createCreatorSubscriptions({
    domainId: youtubeChannelId,
    creatorType: CreatorType.YOUTUBE,
    creatorChannelIds: selectedCreatorChannelIds,
  });

  // prettier-ignore
  const channelMentions = selectedCreatorChannelIds
    .map(channelMention)
    .join(", ");

  const youtubeChannelName = selectedYoutubeChannel?.title ?? name;
  const description = compress`
    Successfully created a subscription for ${bold(youtubeChannelName)}! Posts
    will now be automatically created in ${channelMentions} when
    ${bold(youtubeChannelName)} uploads.
    \n\nPlease allow up to an hour for posts to be created after an upload.
  `;

  const embed = new EmbedBuilder()
    .setColor(Color.SUCCESS)
    .setDescription(description);

  return buttonInteraction.update({
    components: [],
    content: null,
    embeds: [embed],
  });
};
