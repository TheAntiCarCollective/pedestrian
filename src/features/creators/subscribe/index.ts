import { youtube_v3 } from "@googleapis/youtube";
import YoutubeChannel = youtube_v3.Schema$SearchResultSnippet;

import type {
  APIChannel,
  ButtonInteraction,
  Channel,
  ChatInputCommandInteraction,
  GuildChannelManager,
} from "discord.js";
import {
  ActionRowBuilder,
  bold,
  ButtonBuilder,
  ButtonStyle,
  CategoryChannel,
  channelMention,
  ChannelSelectMenuBuilder,
  Collection,
  EmbedBuilder,
  ThreadChannel,
} from "discord.js";
import { compress } from "compress-tag";
import { v4 as uuid } from "uuid";
import loggerFactory from "pino";

import Environment from "../../../environment";
import { Color, JsonError } from "../../../services/discord";
import { getChannelUrl, getThumbnailUrl } from "../../../services/youtube";
import guildSettings from "../../bot/settings/guild";

import * as database from "./database";
import * as youtube from "../youtube";
import { CreatorType, SUPPORTED_CHANNEL_TYPES } from "../constants";
import { getChannels } from "../function";

// region Types
type Webhook = {
  id: string;
  token: string;
};
// endregion

export enum Option {
  NAME = "name",
}

const logger = loggerFactory({
  name: __filename,
});

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

const createCreatorChannels = async (
  guildChannelManager: GuildChannelManager,
  creatorChannels: Collection<string, Channel | APIChannel>,
) => {
  const { guild } = guildChannelManager;
  const { id: guildId } = guild;

  const existingCreatorChannels = await database.getCreatorChannels(guild.id);
  const existingCreatorChannelIds = existingCreatorChannels.map(({ id }) => id);
  const existingWebhooks = existingCreatorChannels.reduce(
    (existingWebhooks, { id, parentId, webhookId, webhookToken }) => {
      const webhook = { id: webhookId, token: webhookToken };
      if (parentId !== null) existingWebhooks.set(parentId, webhook);
      return existingWebhooks.set(id, webhook);
    },
    new Map<string, Webhook>(),
  );

  // It is possible 2 creator channel IDs are threads of the same channel where
  // a webhook will be created. This makes the loop sequentially dependent
  // which means optimizations such as parallelization (mapping each index to a
  // Promise) not possible. At best, we can parallelize database inserts.
  const promises: Promise<unknown>[] = [];

  for (const [, { id, type }] of creatorChannels) {
    const channel = await guildChannelManager.fetch(id);
    if (channel === null) throw new JsonError(guild);
    if (channel instanceof CategoryChannel) throw new JsonError(channel);

    if (!existingCreatorChannelIds.includes(id)) {
      let parentId: string | null = null;
      let webhookId: string;
      let webhookToken: string | null;

      if (channel instanceof ThreadChannel) {
        const { parent } = channel;
        if (parent === null) throw new JsonError(channel);

        parentId = parent.id;
        const webhook = existingWebhooks.get(parentId);

        if (webhook === undefined) {
          const webhook = await parent.createWebhook({
            name: Environment.PROJECT_NAME,
          });

          webhookId = webhook.id;
          webhookToken = webhook.token;
        } else {
          webhookId = webhook.id;
          webhookToken = webhook.token;
        }
      } else {
        const webhook = await channel.createWebhook({
          name: Environment.PROJECT_NAME,
        });

        webhookId = webhook.id;
        webhookToken = webhook.token;
      }

      if (webhookToken === null) throw new JsonError(channel);

      promises.push(
        database.createCreatorChannel({
          id,
          type,
          guildId,
          parentId,
          webhookId,
          webhookToken,
        }),
      );
    }
  }

  return Promise.all(promises);
};

export default async (interaction: ChatInputCommandInteraction) => {
  const { guild, options } = interaction;
  if (guild === null) throw new JsonError(interaction);
  const { id: guildId, channels: guildChannelManager } = guild;

  const creatorSubscriptionsPromise = database.getCreatorSubscriptions(guildId);
  const guildSettingsPromise = guildSettings(guildId);

  let creatorSubscriptions = await creatorSubscriptionsPromise;
  const channels = await getChannels(creatorSubscriptions, guildChannelManager);

  // prettier-ignore
  creatorSubscriptions = creatorSubscriptions
    .filter(({ creatorChannelId }) => channels.has(creatorChannelId));

  const creatorSubscriptionsCount = creatorSubscriptions.length;
  const { maxCreatorSubscriptions } = await guildSettingsPromise;

  const name = options.getString(Option.NAME, true);

  if (creatorSubscriptionsCount >= maxCreatorSubscriptions) {
    const s = maxCreatorSubscriptions === 1 ? "" : "s";
    const description = compress`
      Your request for subscribing to ${bold(name)} has been denied because
      this server is currently only permitted to have
      ${bold(maxCreatorSubscriptions.toString())} creator subscription${s}. Use
      the following command to unsubscribe from creators.
      \n${bold("/creators unsubscribe")}
    `;

    const embed = new EmbedBuilder()
      .setColor(Color.ERROR)
      .setDescription(description);

    return interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  }

  const noResultsExistOptions = <T>(content: T) => {
    const description = compress`
      Your request for subscribing to ${bold(name)} has been denied because no
      results exist for ${bold(name)}. Retry this command with a different
      ${Option.NAME}.
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

  const channelSelectMenuId = uuid();
  const previousButtonId = uuid();
  const nextButtonId = uuid();
  const applyButtonId = uuid();
  const cancelButtonId = uuid();

  let selectedCreatorChannels = new Collection<string, Channel | APIChannel>();
  let selectedYoutubeChannel: YoutubeChannel | undefined;
  let page = 1;

  const youtubeChannelOptions = () => {
    selectedYoutubeChannel = youtubeChannels[page - 1];
    const embed = getEmbedByYoutubeChannel(selectedYoutubeChannel);
    const { channelTitle, title } = selectedYoutubeChannel ?? {};
    const youtubeChannelName = channelTitle ?? title ?? name;

    const channelSelectMenuMaxValues =
      maxCreatorSubscriptions - creatorSubscriptionsCount;
    const countOfSelectedCreatorChannels = selectedCreatorChannels.size;
    const validApplyButton =
      countOfSelectedCreatorChannels > 0 &&
      channelSelectMenuMaxValues <= channelSelectMenuMaxValues;

    const applyButtonLabel = `I want to create a subscription for ${youtubeChannelName}`;
    // prettier-ignore
    const cancelButtonLabel = "None of these creators is the one I am searching for";

    const content = compress`
      Posts will automatically be created in the selected channels whenever
      ${bold(youtubeChannelName)} uploads.
      \n\nPage ${page} of ${maxPage}
    `;

    const channelSelectMenu = new ChannelSelectMenuBuilder()
      .setChannelTypes(...SUPPORTED_CHANNEL_TYPES)
      .setCustomId(channelSelectMenuId)
      .setMaxValues(channelSelectMenuMaxValues);

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
      .setDisabled(!validApplyButton)
      .setLabel(applyButtonLabel)
      .setStyle(ButtonStyle.Success);

    const cancelButton = new ButtonBuilder()
      .setCustomId(cancelButtonId)
      .setLabel(cancelButtonLabel)
      .setStyle(ButtonStyle.Secondary);

    const channelSelectMenuActionRow =
      // prettier-ignore
      new ActionRowBuilder<ChannelSelectMenuBuilder>()
        .addComponents(channelSelectMenu);
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
      channelSelectMenuActionRow,
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
          case channelSelectMenuId:
            if (!interaction.isChannelSelectMenu())
              throw new JsonError(interaction);
            selectedCreatorChannels = interaction.channels;
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
    logger.info(error, "NO_SELECTED_CREATOR_CHANNELS_ERROR");
    await response.delete();
    return response;
  }

  const buttonId = buttonInteraction.customId;
  const { channelId, channelTitle, title } = selectedYoutubeChannel ?? {};

  if (buttonId === cancelButtonId || typeof channelId !== "string")
    return buttonInteraction.update(noResultsExistOptions(null));

  // region Create Discord and Database Resources
  // Defer since createCreatorChannels can potentially take too long
  response = await buttonInteraction.deferUpdate();

  await createCreatorChannels(guildChannelManager, selectedCreatorChannels);
  const creatorChannelIds = [...selectedCreatorChannels.keys()];

  await database.createCreatorSubscriptions({
    domainId: channelId,
    creatorType: CreatorType.YOUTUBE,
    creatorChannelIds,
  });

  // prettier-ignore
  const channelMentions = creatorChannelIds
    .map(channelMention)
    .join(", ");

  const youtubeChannelName = channelTitle ?? title ?? name;
  const description = compress`
    Successfully subscribed to ${bold(youtubeChannelName)}! Posts will now be
    automatically created in ${channelMentions} when
    ${bold(youtubeChannelName)} uploads.
    \n\nPlease allow up to an hour for posts to be created after an upload.
  `;

  const embed = new EmbedBuilder()
    .setColor(Color.SUCCESS)
    .setDescription(description);

  return buttonInteraction.editReply({
    components: [],
    content: null,
    embeds: [embed],
  });
  // endregion
};
