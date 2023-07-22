import type {
  ChatInputCommandInteraction,
  MessageActionRowComponentBuilder,
} from "discord.js";
import {
  ActionRowBuilder,
  bold,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { compress } from "compress-tag";
import { v4 as uuid } from "uuid";

import { Color, JsonError } from "../../../services/discord";
import { message, MessageMode } from "../../../services/discord/commands";

import * as database from "./database";

export enum Option {
  NAME = "name",
  POST_LATEST_NOW = "post_latest_now",
}

export default async (interaction: ChatInputCommandInteraction) => {
  const { guild, options } = interaction;
  if (!guild) throw new JsonError(interaction);

  const { channels } = guild;
  const guildId = guild.id;

  const channelIds = await database.getCreatorChannelIds(guildId);
  let selectedChannelIds = [...channelIds];

  const selectMenuOptionPromises = channelIds.map(async (channelId) => {
    try {
      const channel = await channels.fetch(channelId);
      if (channel === null) throw new JsonError(interaction);

      return new StringSelectMenuOptionBuilder()
        .setLabel(channel.name)
        .setValue(channelId);
    } catch (error) {
      console.info(error);

      selectedChannelIds = selectedChannelIds.filter(
        (selectedChannelId) => selectedChannelId !== channelId,
      );

      await database.deleteCreatorChannel(channelId);
      return undefined;
    }
  });

  const selectMenuOptionsRaw = await Promise.all(selectMenuOptionPromises);
  const selectMenuOptions = selectMenuOptionsRaw
    .filter((option) => option !== undefined)
    .map((option) => option as StringSelectMenuOptionBuilder);
  const maxSelectedValues = selectMenuOptions.length;

  if (maxSelectedValues === 0) {
    const description = compress`
      Your request for creating a creator subscription has been denied because
      this server currently has no creator channels. Use the following command
      to create a creator channel:\n
      ${bold("/creators channels create")}
    `;

    return message(interaction, MessageMode.REPLY, Color.ERROR, description);
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(uuid())
    .addOptions(selectMenuOptions)
    .setMinValues(1)
    .setMaxValues(maxSelectedValues);

  const applyButtonLabel = "Apply";
  const applyButton = new ButtonBuilder()
    .setCustomId(uuid())
    .setLabel(applyButtonLabel)
    .setStyle(ButtonStyle.Primary);

  // prettier-ignore
  const selectMenuRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
      .addComponents(selectMenu);
  // prettier-ignore
  const buttonRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
      .addComponents(applyButton);

  const name = options.getString("name");
  if (name === null) throw new JsonError(interaction);

  const description = compress`
    Posts will automatically be created in the selected creator channels
    whenever ${bold(name)} uploads. Click the ${bold(applyButtonLabel)} button
    when you are finished selecting creator channels. Your request for creating
    a creator subscription will automatically be cancelled if you do not click
    the ${bold(applyButtonLabel)} button within 10 minutes.
  `;

  const response = await message(
    interaction,
    MessageMode.REPLY,
    Color.INFORMATIONAL,
    description,
    (options) => ({
      ...options,
      components: [selectMenuRow],
    }),
  );

  const collectorOptions = { time: 600_000 };
  const collector = response.createMessageComponentCollector(collectorOptions);

  selectedChannelIds = await new Promise((resolve) => {
    collector.on("collect", async (interaction) => {
      if (interaction.isStringSelectMenu()) {
        selectedChannelIds = interaction.values;
        const { message } = interaction;
        const { embeds } = message;

        const components =
          selectedChannelIds.length === 0
            ? [selectMenuRow]
            : [selectMenuRow, buttonRow];

        const updateOptions = { components, embeds };
        await interaction.update(updateOptions);
      } else if (interaction.isButton()) {
        await interaction.deferUpdate();
        resolve(selectedChannelIds);
      }
    });

    collector.on("end", async () => {
      try {
        await response.delete();
      } catch (error) {
        console.info(error);
      } finally {
        resolve([]);
      }
    });
  });
};
