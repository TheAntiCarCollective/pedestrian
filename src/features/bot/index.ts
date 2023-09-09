import type {
  ChatInputCommandInteraction,
  CommandInteraction,
} from "discord.js";
import {
  EmbedBuilder,
  Events,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import assert, { fail as error } from "node:assert";

import discord, {
  Color,
  isUserOwner,
  registerCommand,
} from "../../services/discord";
import Environment from "../../environment";

import onSettings, { Subcommand as SettingsSubcommand } from "./settings";
import { Option as SettingsGuildOption } from "./settings/guild";

export enum SubcommandGroup {
  Settings = "settings",
}

const checkPermissionsResponse = async (
  interaction: ChatInputCommandInteraction,
) => {
  const { user } = interaction;
  const { id: userId } = user;
  if (isUserOwner(userId)) return undefined;

  // prettier-ignore
  const description =
    `You must be an owner of ${Environment.ProjectName} to invoke this command.`;

  const embed = new EmbedBuilder()
    .setColor(Color.Error)
    .setDescription(description);

  return interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
};

const json = new SlashCommandBuilder()
  .setName("bot")
  .setDescription(`Manage ${Environment.ProjectName}`)
  .setDMPermission(false)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommandGroup((subcommandGroup) =>
    subcommandGroup
      .setName(SubcommandGroup.Settings)
      .setDescription("Manage bot settings")
      .addSubcommand((subcommand) =>
        subcommand
          .setName(SettingsSubcommand.Guild)
          .setDescription("Manage guild settings")
          .addStringOption((option) =>
            option
              .setName(SettingsGuildOption.Id)
              .setDescription("ID of the guild to apply settings"),
          )
          .addIntegerOption((option) =>
            // prettier-ignore
            option
              .setName(SettingsGuildOption.MaxCreatorSubscriptions)
              .setDescription(`Set ${SettingsGuildOption.MaxCreatorSubscriptions} setting for guild`)
              .setMinValue(1)
              .setMaxValue(25),
          ),
      ),
  )
  .toJSON();

const onCommand = async (interaction: CommandInteraction) => {
  assert(interaction.isChatInputCommand());
  const response = await checkPermissionsResponse(interaction);
  if (response !== undefined) return response;

  const { options } = interaction;
  const subcommandGroup = options.getSubcommandGroup();

  switch (subcommandGroup) {
    case SubcommandGroup.Settings:
      return onSettings(interaction);
  }

  error();
};

const guildId = Environment.BotGuildId;
if (guildId !== undefined) registerCommand(json, guildId, onCommand);

discord.once(Events.GuildCreate, async ({ commands, id }) => {
  // Detects guildId changes between restarts and
  // deletes old guild command if applicable
  if (guildId !== id) {
    for (const [, guildCommand] of commands.valueOf()) {
      if (json.name === guildCommand.name) {
        await commands.delete(guildCommand);
        break;
      }
    }
  }
});
