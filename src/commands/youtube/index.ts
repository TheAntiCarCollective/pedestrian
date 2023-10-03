import type { CommandInteraction } from "discord.js";

import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import assert from "node:assert";

import { SupportedChannelTypes } from "../../creators";
import { registerCommand } from "../../services/discord";
import onSubscribe, { Option as SubscribeOption } from "./subscribe";
import onUnsubscribe from "./unsubscribe";

enum Subcommand {
  Subscribe = "subscribe",
  Unsubscribe = "unsubscribe",
}

const json = new SlashCommandBuilder()
  .setName("youtube")
  .setDescription("Manage YouTube subscriptions")
  .setDMPermission(false)
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageWebhooks)
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommand.Subscribe)
      .setDescription("Subscribe to a YouTuber")
      .addStringOption((option) =>
        option
          .setName(SubscribeOption.Name)
          .setDescription("Name of the YouTuber to subscribe to")
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
      .setDescription("Unsubscribe from YouTubers"),
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
    default: {
      assert.fail();
    }
  }
};

registerCommand(json, onCommand);
