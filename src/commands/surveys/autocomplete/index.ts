import type { AutocompleteInteraction } from "discord.js";
import assert from "node:assert";

import * as database from "./database";

export default async (interaction: AutocompleteInteraction) => {
  const { guildId, options } = interaction;
  assert(guildId !== null);

  const partialTitle = options.getFocused();
  const titles = await database.findTitles(guildId, partialTitle);
  const titlesAsOptions = titles.map((title) => ({
    name: title,
    value: title,
  }));

  await interaction.respond(titlesAsOptions);
};
