import type { CommandInteraction } from "discord.js";

import assert from "node:assert";

import type { CreatorType } from "../constants";

import { unique } from "../../shared/array";
import session from "./context";
import * as database from "./database";
import UI from "./ui";

export const unsubscribe = async (
  interaction: CommandInteraction,
  creatorType: CreatorType,
  name: (creatorDomainId: string) => Promise<string>,
) => {
  const { guild } = interaction;
  assert(guild !== null);
  const { channels, id: guildId } = guild;

  const creatorSubscriptions =
    // prettier-ignore
    await database.getCreatorSubscriptions(guildId, creatorType);

  if (creatorSubscriptions.length === 0)
    return interaction.reply(UI.noCreatorSubscriptions(creatorType));

  const namePromises = creatorSubscriptions
    .map(({ creatorDomainId }) => creatorDomainId)
    .filter(unique())
    .map(async (creatorDomainId) => {
      const domainName = await name(creatorDomainId);
      return { [creatorDomainId]: domainName };
    });

  const namesArray = await Promise.all(namePromises);
  let names = {};
  for (const name of namesArray) {
    names = { ...names, ...name };
  }

  const partialContext = {
    creatorSubscriptions,
    creatorType,
    names,
    selectedIndexes: [],
  };

  const context = await session.create(partialContext, interaction);
  return interaction.reply(UI.unsubscribeMenu(context, channels));
};
