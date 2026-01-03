import type { CommandInteraction } from "discord.js";

import { Events, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import assert from "node:assert";

import { SupportedChannelTypes } from "../../creators";
import discord, { registerCommand } from "../../shared/discord";
import Environment from "../../shared/environment";
import * as observability from "../../shared/observability";
import onCreators, { Subcommand as CreatorsSubcommand } from "./creators";
import { Option as ChannelMentionRoleOption } from "./creators/channel-mention-role";
import * as database from "./database";
import onSurveys, { Subcommand as SurveysSubcommand } from "./surveys";

// region registerCommand
enum SubcommandGroup {
  Creators = "creators",
  Surveys = "surveys",
}

const json = new SlashCommandBuilder()
  .setName("settings")
  .setDescription(`Customize ${Environment.ProjectName}'s behavior`)
  .setDMPermission(false)
  .setDefaultMemberPermissions(
    PermissionFlagsBits.ManageChannels |
      PermissionFlagsBits.ManageGuild |
      PermissionFlagsBits.ManageRoles |
      PermissionFlagsBits.ManageWebhooks,
  )
  .addSubcommandGroup((subcommandGroup) =>
    subcommandGroup
      .setName(SubcommandGroup.Creators)
      .setDescription("Customize /youtube, /rss behavior")
      .addSubcommand((subcommand) =>
        // prettier-ignore
        subcommand
          .setName(CreatorsSubcommand.DefaultMentionRole)
          .setDescription("Select or unselect role to mention when a creator uploads by default"),
      )
      .addSubcommand((subcommand) =>
        // prettier-ignore
        subcommand
          .setName(CreatorsSubcommand.ChannelMentionRole)
          .setDescription("Select or unselect role to mention when a creator uploads in a channel")
          .addChannelOption((channel) =>
            channel
              .addChannelTypes(...SupportedChannelTypes)
              .setName(ChannelMentionRoleOption.Channel)
              .setDescription("Channel to set override for role to mention"),
          ),
      ),
  )
  .addSubcommandGroup((subcommandGroup) =>
    subcommandGroup
      .setName(SubcommandGroup.Surveys)
      .setDescription(`Customize /${SubcommandGroup.Surveys} behavior`)
      .addSubcommand((subcommand) =>
        subcommand
          .setName(SurveysSubcommand.CreatorRole)
          .setDescription("Select or unselect role allowed to create surveys"),
      ),
  )
  .toJSON();

const onCommand = (interaction: CommandInteraction) => {
  assert(interaction.isChatInputCommand());

  const { options } = interaction;
  switch (options.getSubcommandGroup()) {
    case SubcommandGroup.Creators: {
      return onCreators(interaction);
    }
    case SubcommandGroup.Surveys: {
      return onSurveys(interaction);
    }
    default: {
      assert.fail();
    }
  }
};

registerCommand(json, onCommand);
// endregion

// region Initialize Guilds
const logger = observability.logger(module);

discord.on(Events.ClientReady, ({ guilds: guildManager }) => {
  const guilds = guildManager.valueOf();
  const guildIds = [...guilds.keys()];
  database.initializeGuilds(guildIds).catch((error) => {
    logger.error(error, "SETTINGS_CLIENT_READY_ERROR");
  });
});

discord.on(Events.GuildCreate, ({ id: guildId }) => {
  database.initializeGuilds([guildId]).catch((error) => {
    logger.error(error, "SETTINGS_GUILD_CREATE_ERROR");
  });
});
// endregion
