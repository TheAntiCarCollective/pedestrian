import type { ChatInputCommandInteraction } from "discord.js";
import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { compress } from "compress-tag";

import type { ChatInputCommand } from "../../services/discord/commands";
import { registerCommand } from "../../services/discord/commands";
import { JsonError } from "../../services/discord";

import channels, { Subcommand as ChannelsSubCommand } from "./channels";
import { Option as ChannelsCreateOption } from "./channels/create";
import subscriptions, {
  Subcommand as SubscriptionsSubcommand,
} from "./subscriptions";
import { Option as SubscriptionsCreateOption } from "./subscriptions/create";

export enum SubcommandGroup {
  CHANNELS = "channels",
  SUBSCRIPTIONS = "subscriptions",
}

// region registerCommand
const description = compress`
  Manage creators and creator channels and subscriptions.
`;

const json = new SlashCommandBuilder()
  .setName("creators")
  .setDescription(description)
  .setDMPermission(false)
  .setDefaultMemberPermissions(
    PermissionFlagsBits.ManageChannels |
      PermissionFlagsBits.ManageGuildExpressions |
      PermissionFlagsBits.ManageRoles |
      PermissionFlagsBits.ManageThreads |
      PermissionFlagsBits.ManageWebhooks,
  )
  .addSubcommandGroup((subcommandGroup) =>
    subcommandGroup
      .setName(SubcommandGroup.CHANNELS)
      .setDescription("Manage creator channels")
      .addSubcommand((subcommand) =>
        subcommand
          .setName(ChannelsSubCommand.CREATE)
          .setDescription("Create a creator channel")
          .addStringOption((option) =>
            option
              .setName(ChannelsCreateOption.NAME)
              .setDescription("Name for the creator channel.")
              .setMaxLength(100),
          )
          .addStringOption((option) =>
            option
              .setName(ChannelsCreateOption.GUIDELINES)
              .setDescription("Guidelines for the creator channel.")
              .setMaxLength(1024),
          )
          .addChannelOption((option) =>
            option
              .setName(ChannelsCreateOption.CATEGORY)
              .setDescription("Category for the creator channel.")
              .addChannelTypes(ChannelType.GuildCategory),
          )
          .addBooleanOption((option) =>
            option
              .setName(ChannelsCreateOption.NSFW)
              .setDescription("Is the creator channel NSFW?"),
          ),
      ),
  )
  .addSubcommandGroup((subcommandGroup) =>
    subcommandGroup
      .setName(SubcommandGroup.SUBSCRIPTIONS)
      .setDescription("Manage creator subscriptions")
      .addSubcommand((subcommand) =>
        subcommand
          .setName(SubscriptionsSubcommand.CREATE)
          .setDescription("Create a channel subscription")
          .addStringOption((option) =>
            option
              .setName(SubscriptionsCreateOption.NAME)
              .setDescription("Name of the creator")
              .setRequired(true),
          )
          .addNumberOption((option) =>
            option
              .setName(SubscriptionsCreateOption.POST_LATEST_NOW)
              .setDescription("Post latest N uploads from creator now")
              .setMinValue(0)
              .setMaxValue(10),
          ),
      ),
  )
  .toJSON();

const onInteraction = async (interaction: ChatInputCommandInteraction) => {
  const { options } = interaction;
  const subcommandGroup = options.getSubcommandGroup();

  switch (subcommandGroup) {
    case SubcommandGroup.CHANNELS:
      await channels(interaction);
      break;
    case SubcommandGroup.SUBSCRIPTIONS:
      await subscriptions(interaction);
      break;
    default:
      throw new JsonError(interaction);
  }
};

const command: ChatInputCommand = { json, onInteraction };
void registerCommand(command);
// endregion
