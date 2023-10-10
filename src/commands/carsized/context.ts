import type {
  CommandInteraction,
  MessageComponentInteraction,
} from "discord.js";

import { AttachmentBuilder } from "discord.js";
import loggerFactory from "pino";

import type { CompareCars } from "./types";

import Session from "../../session";
import * as carsized from "./carsized.manager";
import UI from "./ui";

// region Types
export type Context = CompareCars & {
  sessionId: string;
};

type Interaction = CommandInteraction | MessageComponentInteraction;
// endregion

const logger = loggerFactory({
  name: __filename,
});

export const compareCarsUi = async (
  context: Context,
  interaction: Interaction,
) => {
  const response = interaction.isCommand()
    ? await interaction.deferReply()
    : await interaction.update(UI.compareCars(context));
  const childLogger = logger.child({ response });

  // compareCars is reliably slow; immediately return the response while
  // processing compareCars in parallel then edit the response
  carsized
    .compareCars(context)
    .then((screenshot) => {
      const firstCarName = carsized.toName(context.firstCar);
      const secondCarName = carsized.toName(context.secondCar);
      const attachment = new AttachmentBuilder(screenshot, {
        name: `${firstCarName}-vs-${secondCarName}.png`,
      });

      const files = [attachment];
      return response.edit(UI.compareCars(context, files));
    })
    .then((message) => {
      childLogger.debug(message, "COMPARE_CARS_SUCCESS");
    })
    .catch((error) => {
      childLogger.error(error, "COMPARE_CARS_ERROR");
    });

  return response;
};

export default new Session<Context>();
