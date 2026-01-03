import type {
  CommandInteraction,
  MessageComponentInteraction,
} from "discord.js";

import { AttachmentBuilder } from "discord.js";

import type { CompareCars } from "./types";

import Session from "../../session";
import * as observability from "../../shared/observability";
import * as carsized from "./carsized.manager";
import UI from "./ui";

// region Types
export type Context = CompareCars & {
  sessionId: string;
};

type Interaction = CommandInteraction | MessageComponentInteraction;
// endregion

// region Logger
const logger = observability.logger(module);
// endregion

const session = new Session<Context>();
export default session;

export const compareCarsUi = async (
  context: Context,
  interaction: Interaction
) => {
  // "perspective" was wrongly spelled "prospective" initially
  // Use new spelling while supporting older sessions
  if (context.perspective === undefined) {
    context.perspective = context.prospective;
    context = await session.update(context, interaction);
  }

  const response = interaction.isCommand()
    ? await interaction.deferReply()
    : await interaction.update(UI.compareCars(context));
  const childLogger = logger.child({ response });

  // compareCars is reliably slow; immediately return the response while
  // processing compareCars in parallel then edit the response
  carsized
    .compareCars(context)
    .then((screenshot) => Buffer.from(screenshot))
    .then(async (screenshot) => {
      const firstCarName = carsized.toName(context.firstCar);
      const secondCarName = carsized.toName(context.secondCar);
      const attachment = new AttachmentBuilder(screenshot, {
        name: `${firstCarName}-vs-${secondCarName}.png`,
      });

      const files = [attachment];
      const message = await response.edit(UI.compareCars(context, files));
      childLogger.debug(message, "COMPARE_CARS_SUCCESS");
      return message;
    })
    .catch(async (error) => {
      childLogger.error(error, "COMPARE_CARS_ERROR");
      if (interaction.isMessageComponent())
        await response.edit(UI.compareCars(context, []));
    });

  return response;
};
