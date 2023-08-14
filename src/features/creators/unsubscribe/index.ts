import { youtube_v3 } from "@googleapis/youtube";
import YoutubeChannel = youtube_v3.Schema$Channel;

import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
} from "discord.js";
import {
  ActionRowBuilder,
  bold,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { compress } from "compress-tag";
import { v4 as uuid } from "uuid";
import loggerFactory from "pino";

import { Color, JsonError } from "../../../services/discord";

import type { CreatorSubscription } from "./database";
import * as database from "./database";
import * as youtube from "../youtube";
import { CreatorType } from "../constants";
import { getChannels } from "../function";

// region Types
type Creators = {
  [CreatorType.YOUTUBE]: Record<string, YoutubeChannel>;
};
// endregion

const logger = loggerFactory({
  name: __filename,
});

const getCreators = async (creatorSubscriptions: CreatorSubscription[]) => {
  const creatorDomains = {
    [CreatorType.YOUTUBE]: new Set<string>(),
  };

  for (const { creatorDomainId, creatorType } of creatorSubscriptions) {
    const creatorDomainIds = creatorDomains[creatorType];
    creatorDomainIds.add(creatorDomainId);
  }

  const creatorPromises = Object.entries(creatorDomains).map(
    async ([creatorType, creatorDomainIds]) => {
      switch (creatorType) {
        case CreatorType.YOUTUBE: {
          const youtubeChannelPromises: Promise<YoutubeChannel>[] = [];
          for (const creatorDomainId of creatorDomainIds) {
            const youtubeChannelPromise = youtube.getChannel(creatorDomainId);
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
  const { channels: guildChannelManager, id: guildId } = guild;

  let creatorSubscriptions = await database.getCreatorSubscriptions(guildId);
  const channels = await getChannels(creatorSubscriptions, guildChannelManager);

  // prettier-ignore
  creatorSubscriptions = creatorSubscriptions
    .filter(({ creatorChannelId }) => channels.has(creatorChannelId));

  if (creatorSubscriptions.length === 0) {
    const description = compress`
      Your request for unsubscribing has been denied because this server
      currently has no creator subscriptions. Use the following command to
      subscribe to a creator:
      \n${bold("/creators subscribe")}
    `;

    const embed = new EmbedBuilder()
      .setColor(Color.ERROR)
      .setDescription(description);

    return interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  }

  const creators = await getCreators(creatorSubscriptions);

  const indexSelectMenuId = uuid();
  const applyButtonId = uuid();
  const cancelButtonId = uuid();

  let selectedIndexes: number[] = [];

  const options = () => {
    // prettier-ignore
    const applyButtonLabel = "I am finished selecting creators to unsubscribe to";
    const cancelButtonLabel = "I do not want to unsubscribe from any creators";

    const description =
      "Use the select menu to choose the channel and creator to unsubscribe from.";

    const embed = new EmbedBuilder()
      .setColor(Color.INFORMATIONAL)
      .setDescription(description);

    const indexSelectMenuOptions = creatorSubscriptions.map(
      ({ creatorChannelId, creatorDomainId, creatorType }, index) => {
        const channel = channels.get(creatorChannelId);
        if (channel === undefined) throw new JsonError(interaction);

        const creatorDomainIds = creators[creatorType];
        const { snippet } = creatorDomainIds[creatorDomainId] ?? {};
        const { title } = snippet ?? {};

        return new StringSelectMenuOptionBuilder()
          .setDefault(selectedIndexes.includes(index))
          .setDescription(channel.name)
          .setLabel(title ?? creatorDomainId)
          .setValue(index.toString());
      },
    );

    const indexSelectMenu = new StringSelectMenuBuilder()
      .setCustomId(indexSelectMenuId)
      .setMinValues(0)
      .setMaxValues(indexSelectMenuOptions.length)
      .setOptions(indexSelectMenuOptions);

    const applyButton = new ButtonBuilder()
      .setCustomId(applyButtonId)
      .setDisabled(selectedIndexes.length === 0)
      .setLabel(applyButtonLabel)
      .setStyle(ButtonStyle.Danger);

    const cancelButton = new ButtonBuilder()
      .setCustomId(cancelButtonId)
      .setLabel(cancelButtonLabel)
      .setStyle(ButtonStyle.Secondary);

    const indexActionRow =
      // prettier-ignore
      new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(indexSelectMenu);
    const applyActionRow =
      // prettier-ignore
      new ActionRowBuilder<ButtonBuilder>()
        .addComponents(applyButton);
    const cancelActionRow =
      // prettier-ignore
      new ActionRowBuilder<ButtonBuilder>()
        .addComponents(cancelButton);

    return {
      components: [indexActionRow, applyActionRow, cancelActionRow],
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
          case indexSelectMenuId: {
            if (!interaction.isStringSelectMenu())
              throw new JsonError(interaction);

            const { values } = interaction;
            selectedIndexes = values.map((index) => parseInt(index));
            response = await interaction.update(options());
            return false;
          }
          case applyButtonId:
          case cancelButtonId:
            return true;
          default:
            throw new JsonError(interaction);
        }
      },
      time: 600_000, // 10 minutes
    });

    if (!interaction.isButton()) throw new JsonError(interaction);
    buttonInteraction = interaction;
  } catch (error) {
    logger.info(error, "NO_SELECTED_SUBSCRIPTIONS_IDS");
    await response.delete();
    return response;
  }

  const { customId: buttonId } = buttonInteraction;
  const isApplyButton = buttonId === applyButtonId;
  const countOfDeletedSubscriptions = selectedIndexes.length;

  if (isApplyButton) {
    const creatorSubscriptionIds = creatorSubscriptions
      .filter((_, index) => selectedIndexes.includes(index))
      .map(({ id }) => id);

    await database.deleteCreatorSubscriptions(creatorSubscriptionIds);
  }

  const count = bold(countOfDeletedSubscriptions.toString());
  const s = countOfDeletedSubscriptions === 1 ? "" : "s";

  let description: string;
  if (isApplyButton) {
    description = compress`
      Successfully unsubscribed from ${count} creator${s}! Posts will no longer
      be automatically created with the ${count} selected creator${s} in the
      selected channels.
    `;
  } else {
    description =
      "Successfully cancelled unsubscribing from creators! No changes have been applied.";
  }

  const embed = new EmbedBuilder()
    .setColor(Color.SUCCESS)
    .setDescription(description);

  return buttonInteraction.update({
    components: [],
    embeds: [embed],
  });
};
