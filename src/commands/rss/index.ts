import type { CommandInteraction } from "discord.js";
import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import assert, { fail as error } from "node:assert";

import { registerCommand } from "../../services/discord";
import { SupportedChannelTypes } from "../../creators";

import onSubscribe, { Option as SubscribeOption } from "./subscribe";
import onUnsubscribe from "./unsubscribe";

enum Subcommand {
  Subscribe = "subscribe",
  Unsubscribe = "unsubscribe",
}

const json = new SlashCommandBuilder()
  .setName("rss")
  .setDescription("Manage RSS subscriptions")
  .setDMPermission(false)
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageWebhooks)
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommand.Subscribe)
      .setDescription("Subscribe to a RSS feed")
      .addStringOption((option) =>
        option
          .setName(SubscribeOption.URL)
          .setDescription("URL of the RSS feed to subscribe to")
          .setRequired(true),
      )
      .addChannelOption((option) =>
        option
          .addChannelTypes(...SupportedChannelTypes)
          .setName(SubscribeOption.Channel)
          .setDescription("Channel where uploads are posted"),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommand.Unsubscribe)
      .setDescription("Unsubscribe from RSS feeds"),
  )
  .toJSON();

const onCommand = (interaction: CommandInteraction) => {
  assert(interaction.isChatInputCommand());

  const { options } = interaction;
  switch (options.getSubcommand()) {
    case Subcommand.Subscribe: {
      return onSubscribe(interaction);
    }
    case Subcommand.Unsubscribe: {
      return onUnsubscribe(interaction);
    }
  }

  error();
};

registerCommand(json, onCommand);
