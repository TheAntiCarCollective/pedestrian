import type { ChatInputCommandInteraction } from "discord.js";
import { fail as error } from "node:assert";

import onServer from "./server";

export enum Subcommand {
  Server = "server",
}

export default (interaction: ChatInputCommandInteraction) => {
  const { options } = interaction;
  const subcommand = options.getSubcommand();

  switch (subcommand) {
    case Subcommand.Server:
      return onServer(interaction);
  }

  error(subcommand);
};
