import type { Interaction } from "discord.js";
import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import { registerCommand } from "../../services/discord/commands";
import { JsonError } from "../../services/discord";

import onRoles, { Subcommand as RolesSubcommand } from "./roles";
import { Option as RolesServerOption } from "./roles/server";
import onSubscribe, { Option as SubscribeOption } from "./subscribe";
import onUnsubscribe from "./unsubscribe";

// Install
import "./post";

export enum SubcommandGroup {
  ROLES = "roles",
}

export enum Subcommand {
  SUBSCRIBE = "subscribe",
  UNSUBSCRIBE = "unsubscribe",
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
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommand.SUBSCRIBE)
      .setDescription("Subscribe to a creator")
      .addStringOption((option) =>
        option
          .setName(SubscribeOption.NAME)
          .setDescription("Name of the creator to subscribe to")
          .setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommand.UNSUBSCRIBE)
      .setDescription("Unsubscribe to creators"),
  )
  .toJSON();

const onInteraction = (interaction: Interaction) => {
  if (!(interaction instanceof ChatInputCommandInteraction))
    throw new JsonError(interaction);

  const { options } = interaction;
  const subcommandGroup = options.getSubcommandGroup();
  const subcommand = options.getSubcommand();

  switch (subcommandGroup) {
    case SubcommandGroup.ROLES:
      return onRoles(interaction);
    case null:
      switch (subcommand) {
        case Subcommand.SUBSCRIBE:
          return onSubscribe(interaction);
        case Subcommand.UNSUBSCRIBE:
          return onUnsubscribe(interaction);
        default:
          throw new JsonError(interaction);
      }
    default:
      throw new JsonError(interaction);
  }
};

void registerCommand({
  json,
  onInteraction,
});
