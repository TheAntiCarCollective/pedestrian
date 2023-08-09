import type { ChatInputCommandInteraction } from "discord.js";
import {
  EmbedBuilder,
  Events,
  PermissionFlagsBits,
  SlashCommandBuilder,
  User,
} from "discord.js";

import type { ChatInputCommand } from "../../services/discord/commands";
import { registerCommand } from "../../services/discord/commands";
import discord, { Color, JsonError } from "../../services/discord";
import Environment from "../../environment";

import onSettings, { Subcommand as SettingsSubcommand } from "./settings";
import { Option as SettingsGuildOption } from "./settings/guild";

const isUserOwner = async ({ client, user }: ChatInputCommandInteraction) => {
  const { application } = client;
  const { owner } = application.partial
    ? await application.fetch()
    : application;

  if (owner === null) return false;

  const { id: userId } = user;
  if (owner instanceof User) return owner.id === userId;

  const { members } = owner;
  return members.has(userId);
};

export enum SubcommandGroup {
  SETTINGS = "settings",
}

const json = new SlashCommandBuilder()
  .setName("bot")
  .setDescription(`Manage ${Environment.PROJECT_NAME}`)
  .setDMPermission(false)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommandGroup((subcommandGroup) =>
    subcommandGroup
      .setName(SubcommandGroup.SETTINGS)
      .setDescription("Manage bot settings")
      .addSubcommand((subcommand) =>
        subcommand
          .setName(SettingsSubcommand.GUILD)
          .setDescription("Manage guild settings")
          .addStringOption((option) =>
            option
              .setName(SettingsGuildOption.ID)
              .setDescription("ID of the guild to apply settings"),
          )
          .addIntegerOption((option) =>
            // prettier-ignore
            option
              .setName(SettingsGuildOption.MAX_CREATOR_CHANNELS)
              .setDescription(`Set ${SettingsGuildOption.MAX_CREATOR_CHANNELS} setting for guild`)
              .setMinValue(1),
          )
          .addIntegerOption((option) =>
            // prettier-ignore
            option
              .setName(SettingsGuildOption.MAX_CREATOR_SUBSCRIPTIONS)
              .setDescription(`Set ${SettingsGuildOption.MAX_CREATOR_SUBSCRIPTIONS} setting for guild`)
              .setMinValue(1)
              .setMaxValue(25),
          ),
      ),
  )
  .toJSON();

const onInteraction = async (interaction: ChatInputCommandInteraction) => {
  if (await isUserOwner(interaction)) {
    const { options } = interaction;
    const subcommandGroup = options.getSubcommandGroup();

    switch (subcommandGroup) {
      case SubcommandGroup.SETTINGS:
        await onSettings(interaction);
        return;
      default:
        throw new JsonError(interaction);
    }
  }

  const description = `You must be an owner of ${Environment.PROJECT_NAME} to invoke this command.`;

  const embed = new EmbedBuilder()
    .setColor(Color.ERROR)
    .setDescription(description);

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
};

const guildId = Environment.BOT_GUILD_ID;
const command: ChatInputCommand = { guildId, json, onInteraction };

if (guildId !== undefined) void registerCommand(command);

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
