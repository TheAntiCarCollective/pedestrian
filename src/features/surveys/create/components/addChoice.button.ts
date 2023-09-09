import { registerComponent } from "../../../../services/discord";
import * as session from "../../../../session";

import ComponentId from "./index";
import type Context from "../context";
import * as withContext from "../context";
import * as ui from "../ui";
import { InitialChoice } from "../../constants";

registerComponent(
  ComponentId.AddChoiceButton,
  async (interaction, sessionId) => {
    const oldContext = await session.read<Context>(sessionId);
    const choices = withContext.getChoices(oldContext);

    oldContext.selectedChoiceIndex =
      choices.length === 0 ? 0 : oldContext.selectedChoiceIndex + 1;
    choices[oldContext.selectedChoiceIndex] = InitialChoice;

    const context = await session.update(oldContext, interaction);
    await interaction.showModal(ui.choiceModal(context));
    return undefined;
  },
);
