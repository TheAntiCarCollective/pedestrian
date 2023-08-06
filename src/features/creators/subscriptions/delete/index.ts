import { youtube_v3 } from "googleapis";
import YoutubeChannel = youtube_v3.Schema$Channel;

import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
  ForumChannel,
} from "discord.js";
import {
  ActionRowBuilder,
  bold,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  DiscordAPIError,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { compress } from "compress-tag";
import { v4 as uuid } from "uuid";
import loggerFactory from "pino";

import { Color, JsonError } from "../../../../services/discord";

import type { CreatorSubscription } from "./database";
import * as localDatabase from "./database";
import * as creatorsDatabase from "../../database";
import { CreatorType } from "../../constants";
import * as youtube from "../../youtube";

// region Types
type Creators = {
  [CreatorType.YOUTUBE]: Record<string, YoutubeChannel>;
};
// endregion

// region Module Objects
const database = {
  ...localDatabase,
  ...creatorsDatabase,
};

const logger = loggerFactory({
  name: __filename,
});
// endregion

const getCreatorChannels = async (
  creatorSubscriptions: CreatorSubscription[],
  interaction: ChatInputCommandInteraction,
) => {
  const { guild } = interaction;
  if (guild === null) throw new JsonError(interaction);
  const guildChannelManager = guild.channels;

  const creatorChannelIds = creatorSubscriptions
    .map(({ creatorChannelId }) => creatorChannelId)
    .reduce((set, id) => set.add(id), new Set<string>());

  const creatorChannelPromises: Promise<ForumChannel | undefined>[] = [];
  for (const creatorChannelId of creatorChannelIds) {
    const creatorChannelPromise = guildChannelManager
      .fetch(creatorChannelId)
      .then((channel) => {
        if (channel?.type === ChannelType.GuildForum) return channel;
        throw new JsonError(interaction);
      })
      .catch(async (error) => {
        if (error instanceof DiscordAPIError && error.status === 404) {
          logger.info(error, "GET_CREATOR_CHANNELS_ERROR");
          await database.deleteCreatorChannel(creatorChannelId);
          return undefined;
        }

        throw error;
      });

    creatorChannelPromises.push(creatorChannelPromise);
  }

  const creatorChannelsRaw = await Promise.all(creatorChannelPromises);
  return creatorChannelsRaw
    .filter((channel) => channel !== undefined)
    .map((channel) => channel as NonNullable<typeof channel>);
};

const getCreators = async (
  creatorSubscriptions: CreatorSubscription[],
  creatorChannelIds: string[],
) => {
  const creatorDomainIds = {
    [CreatorType.YOUTUBE]: new Set<string>(),
  };

  for (const creatorSubscription of creatorSubscriptions) {
    const { creatorChannelId, domainId, creatorType } = creatorSubscription;
    if (creatorChannelIds.includes(creatorChannelId)) {
      const domainIds = creatorDomainIds[creatorType];
      domainIds.add(domainId);
    }
  }

  const creatorPromises = Object.entries(creatorDomainIds).map(
    async ([creatorType, domainIds]) => {
      switch (creatorType) {
        case CreatorType.YOUTUBE: {
          const youtubeChannelPromises: Promise<YoutubeChannel>[] = [];
          for (const domainId of domainIds) {
            const youtubeChannelPromise = youtube.getChannel(domainId);
            youtubeChannelPromises.push(youtubeChannelPromise);
          }

          const youtubeChannels = await Promise.all(youtubeChannelPromises);
          const youtubeCreators: Record<string, YoutubeChannel> = {};

          for (const youtubeChannel of youtubeChannels) {
            const { id } = youtubeChannel;
            if (typeof id !== "string") {
              const message = JSON.stringify(youtubeChannel);
              throw new Error(message);
            }

            youtubeCreators[id] = youtubeChannel;
          }

          return { [creatorType]: youtubeCreators };
        }
        default:
          throw new Error(creatorType);
      }
    },
  );

  const creators = await Promise.all(creatorPromises);
  return Object.assign({}, ...creators) as Creators;
};

export default async (interaction: ChatInputCommandInteraction) => {
  const { guild } = interaction;
  if (guild === null) throw new JsonError(interaction);
  const { id: guildId } = guild;

  const creatorSubscriptions = await database.getCreatorSubscriptions(guildId);
  // prettier-ignore
  const creatorChannels = await getCreatorChannels(creatorSubscriptions, interaction);

  if (creatorChannels.length === 0) {
    const description = compress`
      Your request for deleting a creator subscription has been denied because
      this server currently has no creator subscriptions. Use the following
      command to create a creator subscription:
      \n${bold("/creators subscriptions create")}
    `;

    const embed = new EmbedBuilder()
      .setColor(Color.ERROR)
      .setDescription(description);

    return interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  }

  const creatorChannelIds = creatorChannels.map(({ id }) => id);
  const creators = await getCreators(creatorSubscriptions, creatorChannelIds);

  const channelSelectMenuId = uuid();
  const subscriptionSelectMenuId = uuid();
  const applyButtonId = uuid();
  const cancelButtonId = uuid();

  const { id: defaultChannelId } = creatorChannels[0] ?? {};
  if (defaultChannelId === undefined) throw new JsonError(interaction);

  let selectedChannelId = defaultChannelId;
  const selectedSubscriptionIds: number[] = [];

  const options = () => {
    const applyButtonLabel =
      "I am finished selecting creator subscriptions to delete";
    const cancelButtonLabel =
      "I do not want to delete any creator subscriptions";

    const description = compress`
      Use the first select menu to choose the creator channel to delete creator
      subscriptions from; then use the second select menu to choose the creator
      subscriptions to delete.
    `;

    const embed = new EmbedBuilder()
      .setColor(Color.INFORMATIONAL)
      .setDescription(description);

    const channelSelectMenuOptions = creatorChannels.map(({ id, name }) =>
      new StringSelectMenuOptionBuilder()
        .setDefault(selectedChannelId === id)
        .setLabel(name)
        .setValue(id),
    );

    const channelSelectMenu = new StringSelectMenuBuilder()
      .addOptions(channelSelectMenuOptions)
      .setCustomId(channelSelectMenuId);

    const subscriptionSelectMenuOptions = creatorSubscriptions
      .filter(({ creatorChannelId }) => creatorChannelId === selectedChannelId)
      .map(({ id, domainId, creatorType }) => {
        let label: string;
        switch (creatorType) {
          case CreatorType.YOUTUBE: {
            const youtubeChannels = creators[creatorType];
            const { snippet } = youtubeChannels[domainId] ?? {};
            const { title } = snippet ?? {};
            label = title ?? domainId;
            break;
          }
          default:
            throw new Error(creatorType);
        }

        return new StringSelectMenuOptionBuilder()
          .setDefault(selectedSubscriptionIds.includes(id))
          .setLabel(label)
          .setValue(id.toString());
      });

    const subscriptionSelectMenu = new StringSelectMenuBuilder()
      .addOptions(subscriptionSelectMenuOptions)
      .setCustomId(subscriptionSelectMenuId)
      .setMinValues(0)
      .setMaxValues(subscriptionSelectMenuOptions.length);

    const applyButton = new ButtonBuilder()
      .setCustomId(applyButtonId)
      .setLabel(applyButtonLabel)
      .setStyle(ButtonStyle.Danger);

    const cancelButton = new ButtonBuilder()
      .setCustomId(cancelButtonId)
      .setLabel(cancelButtonLabel)
      .setStyle(ButtonStyle.Secondary);

    const channelActionRow =
      // prettier-ignore
      new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(channelSelectMenu);
    const subscriptionActionRow =
      // prettier-ignore
      new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(subscriptionSelectMenu);
    const applyActionRow =
      // prettier-ignore
      new ActionRowBuilder<ButtonBuilder>()
        .addComponents(applyButton);
    const cancelActionRow =
      // prettier-ignore
      new ActionRowBuilder<ButtonBuilder>()
        .addComponents(cancelButton);

    const components = [
      channelActionRow,
      subscriptionActionRow,
      applyActionRow,
      cancelActionRow,
    ];

    return {
      components,
      embeds: [embed],
      ephemeral: true,
    };
  };

  let response = await interaction.reply(options());
  let buttonInteraction: ButtonInteraction;

  try {
    const interaction = await response.awaitMessageComponent({
      filter: async (interaction) => {
        switch (interaction.customId) {
          case channelSelectMenuId: {
            if (!interaction.isStringSelectMenu())
              throw new JsonError(interaction);

            const { values } = interaction;
            selectedChannelId = values[0] ?? selectedChannelId;
            break;
          }
          case subscriptionSelectMenuId: {
            if (!interaction.isStringSelectMenu())
              throw new JsonError(interaction);

            // Remove all subscription IDs for selectedChannelId
            for (const { id, creatorChannelId } of creatorSubscriptions) {
              if (creatorChannelId === selectedChannelId) {
                const index = selectedSubscriptionIds.indexOf(id);
                if (index >= 0) selectedSubscriptionIds.splice(index, 1);
              }
            }

            // Add selected subscription IDs for selectedChannelId
            const { values: rawValues } = interaction;
            const values = rawValues.map((rawValue) => parseInt(rawValue));
            selectedSubscriptionIds.push(...values);
            break;
          }
          case applyButtonId:
          case cancelButtonId:
            return true;
          default:
            throw new JsonError(interaction);
        }

        response = await interaction.update(options());
        return false;
      },
      time: 600_000, // 10 minutes
    });

    if (!interaction.isButton()) throw new JsonError(interaction);
    buttonInteraction = interaction;
  } catch (error) {
    logger.info(error, "NO_CREATOR_SUBSCRIPTION_IDS_SELECTED");
    await response.delete();
    return response;
  }

  const { customId: buttonId } = buttonInteraction;
  const isApplyButton = buttonId === applyButtonId;
  const { length } = selectedSubscriptionIds;

  if (isApplyButton && length > 0) {
    await database.deleteCreatorSubscriptions(selectedSubscriptionIds);
  }

  const count = bold(length.toString());
  const s = length === 1 ? "" : "s";

  const description = isApplyButton
    ? `Successfully deleted ${count} creator subscription${s}!`
    : `Successfully cancelled deleting creator subscriptions!`;

  const embed = new EmbedBuilder()
    .setColor(Color.SUCCESS)
    .setDescription(description);

  return buttonInteraction.update({
    components: [],
    embeds: [embed],
  });
};
