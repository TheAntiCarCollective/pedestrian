import type { ChatInputCommandInteraction } from "discord.js";

import { JsonError } from "../../../services/discord";

import onCreate from "./create";
import onDelete from "./delete";

export enum Subcommand {
  CREATE = "create",
  DELETE = "delete",
}

export default (interaction: ChatInputCommandInteraction) => {
  const { options } = interaction;
  const subcommand = options.getSubcommand();

  switch (subcommand) {
    case Subcommand.CREATE:
      return onCreate(interaction);
    case Subcommand.DELETE:
      return onDelete(interaction);
    default:
      throw new JsonError(interaction);
  }
};
