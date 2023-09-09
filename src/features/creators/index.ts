import type { CommandInteraction } from "discord.js";
import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import assert, { fail as error } from "node:assert";

import { registerCommand } from "../../services/discord";

import onRoles, { Subcommand as RolesSubcommand } from "./roles";
import { Option as RolesServerOption } from "./roles/server";
import onSubscribe, { Option as SubscribeOption } from "./subscribe";
import onUnsubscribe from "./unsubscribe";

// Install
import "./post";

export enum SubcommandGroup {
  Roles = "roles",
}

export enum Subcommand {
  Subscribe = "subscribe",
  Unsubscribe = "unsubscribe",
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
      .setName(SubcommandGroup.Roles)
      .setDescription("Manage roles for creators")
      .addSubcommand((subcommand) =>
        subcommand
          .setName(RolesSubcommand.Server)
          .setDescription("Set default role to mention in creator posts")
          .addRoleOption((roleOption) =>
            roleOption
              .setName(RolesServerOption.Role)
              .setDescription("Role to mention in creator posts"),
          ),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommand.Subscribe)
      .setDescription("Subscribe to a creator")
      .addStringOption((option) =>
        option
          .setName(SubscribeOption.Name)
          .setDescription("Name of the creator to subscribe to")
          .setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommand.Unsubscribe)
      .setDescription("Unsubscribe from creators"),
  )
  .toJSON();

const onCommand = (interaction: CommandInteraction) => {
  assert(interaction.isChatInputCommand());

  const { options } = interaction;
  const subcommandGroup = options.getSubcommandGroup();
  const subcommand = options.getSubcommand();

  switch (subcommandGroup) {
    case SubcommandGroup.Roles:
      return onRoles(interaction);
    case null:
      switch (subcommand) {
        case Subcommand.Subscribe:
          return onSubscribe(interaction);
        case Subcommand.Unsubscribe:
          return onUnsubscribe(interaction);
      }
  }

  error();
};

registerCommand(json, undefined, onCommand);
