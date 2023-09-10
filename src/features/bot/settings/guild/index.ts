import type { ChatInputCommandInteraction } from "discord.js";
import { bold, codeBlock, EmbedBuilder } from "discord.js";
import { compress } from "compress-tag";
import assert from "node:assert";

import { Color } from "../../../../services/discord";

import type * as types from "./types";
import * as database from "./database";

// region Types
export type GuildSettings = types.GuildSettings;
type PartialGuildSettings = Partial<GuildSettings> & Pick<GuildSettings, "id">;
// endregion

export enum Option {
  Id = "id",
  MaxCreatorSubscriptions = "max_creator_subscriptions",
}

const guildSettings = async (parameter: string | PartialGuildSettings) => {
  const isGuildId = typeof parameter === "string";
  const guildId = isGuildId ? parameter : parameter.id;
  const guildSettings = await database.getOrCreateGuildSettings(guildId);

  if (isGuildId) return guildSettings;

  for (const key of Object.keys(parameter)) {
    // @ts-expect-error key is guaranteed to be a property of parameter
    if (parameter[key] === undefined) {
      // @ts-expect-error See above
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete parameter[key];
    }
  }

  const newGuildSettings = {
    ...guildSettings,
    ...parameter,
  };

  await database.setGuildSettings(newGuildSettings);
  return newGuildSettings;
};

export const onGuild = async (interaction: ChatInputCommandInteraction) => {
  const { guildId: defaultGuildId, options } = interaction;
  assert(defaultGuildId !== null);
  const guildId = options.getString(Option.Id) ?? defaultGuildId;

  const maxCreatorSubscriptions =
    options.getInteger(Option.MaxCreatorSubscriptions) ?? undefined;

  const newGuildSettings = await guildSettings({
    id: guildId,
    maxCreatorSubscriptions,
  });

  const description = compress`
    Successfully applied settings to guild ${bold(guildId)}:
    \n${codeBlock(JSON.stringify(newGuildSettings, undefined, 2))}
  `;

  const embed = new EmbedBuilder()
    .setColor(Color.Success)
    .setDescription(description);

  return interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
};

export default guildSettings;