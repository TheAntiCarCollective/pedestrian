import { youtube_v3 } from "googleapis";
import YoutubeChannel = youtube_v3.Schema$SearchResultSnippet;

import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
  MessageActionRowComponentBuilder,
} from "discord.js";
import {
  ActionRowBuilder,
  bold,
  ButtonBuilder,
  ButtonStyle,
  channelMention,
  ChannelType,
  ComponentType,
  DiscordAPIError,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { compress } from "compress-tag";
import { v4 as uuid } from "uuid";

import { Color, JsonError } from "../../../../services/discord";
import { getChannelUrl, getThumbnailUrl } from "../../../../services/youtube";

import * as database from "./database";
import * as youtube from "./youtube";
import { CreatorType } from "../../constants";
import * as creatorsDatabase from "../../database";

export enum Option {
  NAME = "name",
}

const TIMEOUT_IN_5_MINUTES = 300_000;

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
  // region Step 1: Check if a creator channel exists
  const { guild, options } = interaction;
  if (!guild) throw new JsonError(interaction);

  const guildChannelManager = guild.channels;
  const guildId = guild.id;

  const channelIds = await database.getCreatorChannelIds(guildId);
  const channelPromises = channelIds.map(async (channelId) => {
    // Check if channel exists, if not, then delete from database
    try {
      const channel = await guildChannelManager.fetch(channelId);
      if (channel?.type === ChannelType.GuildForum) return channel;
      throw new JsonError(interaction);
    } catch (error) {
      if (error instanceof DiscordAPIError && error.status === 404) {
        await creatorsDatabase.deleteCreatorChannel(channelId);
        console.info(error);
        return undefined;
      }

      throw error;
    }
  });

  const channelsRaw = await Promise.all(channelPromises);
  const channels = channelsRaw
    .filter((channel) => channel !== undefined)
    .map((channel) => channel as NonNullable<typeof channel>);

  if (channels.length === 0) {
    const description = compress`
      Your request for creating a creator subscription has been denied because
      this server currently has no creator channels. Use the following command
      to create a creator channel:
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
  // endregion

  // region Step 2: Get user selected creator channels
  const name = options.getString(Option.NAME);
  if (name === null) throw new JsonError(interaction);

  let selectedOptions: string[] =
    channels.length === 1 ? [channels[0]!.id] : [];

  const creatorChannelOptions = () => {
    const selectMenuOptions = channels.map(({ id, name }) =>
      new StringSelectMenuOptionBuilder()
        .setDefault(selectedOptions.includes(id))
        .setLabel(name)
        .setValue(id),
    );

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(uuid()) // Required, but not used
      .addOptions(selectMenuOptions)
      .setMinValues(1);

    const buttonLabel = "I am finished selecting creator channels";
    const button = new ButtonBuilder()
      .setCustomId(uuid()) // Required, but not used
      .setDisabled(selectedOptions.length === 0)
      .setLabel(buttonLabel)
      .setStyle(ButtonStyle.Success);

    const selectMenuActionRow =
      // prettier-ignore
      new ActionRowBuilder<MessageActionRowComponentBuilder>()
        .addComponents(selectMenu);
    const buttonActionRow =
      // prettier-ignore
      new ActionRowBuilder<MessageActionRowComponentBuilder>()
        .addComponents(button);

    const description = compress`
      Posts will automatically be created in the selected creator channels
      whenever ${bold(name)} uploads.
      \nYour request for creating a creator subscription will automatically be
      cancelled if you do not click ${bold(buttonLabel)} within 5 minutes.
    `;

    const embed = new EmbedBuilder()
      .setColor(Color.INFORMATIONAL)
      .setDescription(description);

    return {
      components: [selectMenuActionRow, buttonActionRow],
      embeds: [embed],
      ephemeral: true,
    };
  };

  let response = await interaction.reply(creatorChannelOptions());
  let buttonInteraction: ButtonInteraction;

  try {
    const interaction = await response.awaitMessageComponent({
      filter: async (interaction) => {
        if (interaction.isStringSelectMenu()) {
          selectedOptions = interaction.values;
          response = await interaction.update(creatorChannelOptions());
        }

        return interaction.isButton();
      },
      time: TIMEOUT_IN_5_MINUTES,
    });

    if (!interaction.isButton()) throw new JsonError(interaction);
    buttonInteraction = interaction;
  } catch (error) {
    await response.delete();
    console.info(error);
    return response;
  }
  // endregion

  // region Step 3: Get user selected creator
  const noResultsExistOptions = () => {
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
      content: null,
      embeds: [embed],
      ephemeral: true,
    };
  };

  const youtubeChannels = await youtube.getChannels(name);
  const maxPage = youtubeChannels.length;
  if (maxPage === 0) return buttonInteraction.update(noResultsExistOptions());

  const previousButtonId = uuid();
  const nextButtonId = uuid();
  const applyButtonId = uuid();
  const cancelButtonId = uuid();

  let selectedYoutubeChannel: YoutubeChannel | undefined;
  let page = 1;

  const youtubeChannelOptions = () => {
    selectedYoutubeChannel = youtubeChannels[page - 1];
    const embed = getEmbedByYoutubeChannel(selectedYoutubeChannel);

    const applyButtonLabel = "I want to create a subscription for this creator";
    // prettier-ignore
    const cancelButtonLabel = "None of these creators is the one I am searching for";

    const content = compress`
      Page ${page} of ${maxPage}
      \nYour request for creating a creator subscription will automatically be
      cancelled if you do not click ${bold(applyButtonLabel)} or
      ${bold(cancelButtonLabel)} within 5 minutes.
    `;

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
      .setLabel(applyButtonLabel)
      .setStyle(ButtonStyle.Success);

    const cancelButton = new ButtonBuilder()
      .setCustomId(cancelButtonId)
      .setLabel(cancelButtonLabel)
      .setStyle(ButtonStyle.Danger);

    const pageActionRow =
      // prettier-ignore
      new ActionRowBuilder<MessageActionRowComponentBuilder>()
        .addComponents(previousButton, nextButton);
    const applyActionRow =
      // prettier-ignore
      new ActionRowBuilder<MessageActionRowComponentBuilder>()
        .addComponents(applyButton);
    const cancelActionRow =
      // prettier-ignore
      new ActionRowBuilder<MessageActionRowComponentBuilder>()
        .addComponents(cancelButton);

    return {
      components: [pageActionRow, applyActionRow, cancelActionRow],
      content,
      embeds: [embed],
      ephemeral: true,
    };
  };

  response = await buttonInteraction.update(youtubeChannelOptions());

  try {
    buttonInteraction = await response.awaitMessageComponent({
      componentType: ComponentType.Button,
      filter: async (interaction) => {
        switch (interaction.customId) {
          case previousButtonId:
            page -= 1;
            response = await interaction.update(youtubeChannelOptions());
            return false;
          case nextButtonId:
            page += 1;
            response = await interaction.update(youtubeChannelOptions());
            return false;
          case applyButtonId:
          case cancelButtonId:
            return true;
          default:
            throw new JsonError(interaction);
        }
      },
      time: TIMEOUT_IN_5_MINUTES,
    });
  } catch (error) {
    await response.delete();
    console.info(error);
    return response;
  }

  const buttonId = buttonInteraction.customId;
  const youtubeChannelId = selectedYoutubeChannel?.channelId;

  if (buttonId === cancelButtonId || typeof youtubeChannelId !== "string")
    return buttonInteraction.update(noResultsExistOptions());

  await database.createSubscriptions({
    domainId: youtubeChannelId,
    creatorType: CreatorType.YOUTUBE,
    creatorChannelIds: selectedOptions,
  });

  // prettier-ignore
  const channelMentions = selectedOptions
    .map(channelMention)
    .join(", ");

  const youtubeChannelName = selectedYoutubeChannel?.title ?? name;
  const description = compress`
    Successfully created a subscription for ${bold(youtubeChannelName)}! Posts
    will now be automatically created in ${channelMentions} when
    ${bold(youtubeChannelName)} uploads.
    \nNote: It may take up to an hour for posts to be created after an upload.
  `;

  const embed = new EmbedBuilder()
    .setColor(Color.SUCCESS)
    .setDescription(description);

  return buttonInteraction.update({
    components: [],
    content: null,
    embeds: [embed],
  });
  // endregion
};
