import type { CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "discord.js";
import assert, { fail as error } from "node:assert";

import { registerCommand } from "../../services/discord";

import onCreate, { Option as CreateOption } from "./create";
import onDelete, { Option as DeleteOption } from "./delete";
import onSearch, { Option as SearchOption } from "./search";
import onAutocomplete from "./autocomplete";

enum Subcommand {
  Create = "create",
  Delete = "delete",
  Search = "search",
}

const json = new SlashCommandBuilder()
  .setName("surveys")
  .setDescription("Manage surveys")
  .setDMPermission(false)
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommand.Create)
      .setDescription("Create a survey")
      .addStringOption((option) =>
        option
          .setAutocomplete(true)
          .setName(CreateOption.Title)
          .setDescription("Title of the survey to create")
          .setMaxLength(100)
          .setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommand.Delete)
      .setDescription("Delete a survey")
      .addStringOption((option) =>
        option
          .setAutocomplete(true)
          .setName(DeleteOption.Title)
          .setDescription("Title of the survey to delete")
          .setMaxLength(100)
          .setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommand.Search)
      .setDescription("Search for a survey")
      .addStringOption((option) =>
        option
          .setAutocomplete(true)
          .setName(SearchOption.Title)
          .setDescription("Title of the survey")
          .setMaxLength(100)
          .setRequired(true),
      ),
  )
  .toJSON();

const onCommand = (interaction: CommandInteraction) => {
  assert(interaction.isChatInputCommand());

  const { options } = interaction;
  const subcommand = options.getSubcommand();

  switch (subcommand) {
    case Subcommand.Create: {
      return onCreate(interaction);
    }
    case Subcommand.Delete: {
      return onDelete(interaction);
    }
    case Subcommand.Search: {
      return onSearch(interaction);
    }
  }

  error();
};

registerCommand(json, onCommand, onAutocomplete);
