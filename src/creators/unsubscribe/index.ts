import type { CommandInteraction } from "discord.js";
import assert from "node:assert";

import { isUnique } from "../../helpers";

import session from "./context";
import * as database from "./database";
import UI from "./ui";
import { CreatorType } from "../constants";

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
    .filter(isUnique)
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
    selectedIndexes: [],
    creatorType,
    creatorSubscriptions,
    names,
  };

  const context = await session.create(partialContext, interaction);
  return interaction.reply(UI.unsubscribeMenu(context, channels));
};
