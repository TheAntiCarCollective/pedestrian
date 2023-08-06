import type { ChatInputCommandInteraction } from "discord.js";
import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import type { ChatInputCommand } from "../../services/discord/commands";
import { registerCommand } from "../../services/discord/commands";
import { JsonError } from "../../services/discord";

import onChannels, { Subcommand as ChannelsSubcommand } from "./channels";
import { Option as ChannelsCreateOption } from "./channels/create";
import onRoles, { Subcommand as RolesSubcommand } from "./roles";
import { Option as RolesServerOption } from "./roles/server";
import onSubscriptions, {
  Subcommand as SubscriptionsSubcommand,
} from "./subscriptions";
import { Option as SubscriptionsCreateOption } from "./subscriptions/create";

// Install
import "./post";

export enum SubcommandGroup {
  CHANNELS = "channels",
  ROLES = "roles",
  SUBSCRIPTIONS = "subscriptions",
}

const json = new SlashCommandBuilder()
  .setName("creators")
  .setDescription("Manage creators")
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
          .setName(ChannelsSubcommand.CREATE)
          .setDescription("Create a creator channel")
          .addStringOption((option) =>
            option
              .setName(ChannelsCreateOption.NAME)
              .setDescription("Name for the creator channel")
              .setMaxLength(100),
          )
          .addChannelOption((option) =>
            option
              .setName(ChannelsCreateOption.CATEGORY)
              .setDescription("Category for the creator channel")
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
      .setName(SubcommandGroup.ROLES)
      .setDescription("Manage roles for creators")
      .addSubcommand((subcommand) =>
        subcommand
          .setName(RolesSubcommand.SERVER)
          .setDescription("Set default role to mention in creator posts")
          .addRoleOption((roleOption) =>
            roleOption
              .setName(RolesServerOption.ROLE)
              .setDescription("Role to mention in creator posts"),
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
          ),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName(SubscriptionsSubcommand.DELETE)
          .setDescription("Delete channel subscriptions"),
      ),
  )
  .toJSON();

const onInteraction = async (interaction: ChatInputCommandInteraction) => {
  const { options } = interaction;
  const subcommandGroup = options.getSubcommandGroup();

  switch (subcommandGroup) {
    case SubcommandGroup.CHANNELS:
      await onChannels(interaction);
      break;
    case SubcommandGroup.ROLES:
      await onRoles(interaction);
      break;
    case SubcommandGroup.SUBSCRIPTIONS:
      await onSubscriptions(interaction);
      break;
    default:
      throw new JsonError(interaction);
  }
};

const command: ChatInputCommand = { json, onInteraction };
void registerCommand(command);
