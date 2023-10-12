import type { BaseMessageOptions } from "discord.js";

import { compress } from "compress-tag";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  bold,
} from "discord.js";

import type { Context } from "../context";

import { Color } from "../../../shared/discord";
import Environment from "../../../shared/environment";
import * as carsized from "../carsized.manager";
import { Prospective, Units } from "../constants";

export enum UIID {
  FrontButton = "26b9b11a-0134-46b0-9552-6a8d9353176e",
  ImperialButton = "3249e951-34ed-4a33-b4ec-8141076c2c08",
  MetricButton = "61a44638-acde-4d25-8868-b0e53407edf5",
  RearButton = "30f8303e-8f3e-42bb-bfbe-123258d5b8cc",
  SideButton = "4ebb276e-bb5f-41f8-a412-3206634d0d45",
  SwapButton = "b2720dab-02b8-4751-a35b-8832bfb81b2e",
}

// region No Car Exists
const noCarExistsEmbeds = (carId: string) => {
  const description = compress`
    Your request for comparing cars has been denied because no car exists with
    an ID of ${bold(carId)}. Retry this command and use the provided options.
  `;

  const embed = new EmbedBuilder()
    .setColor(Color.Error)
    .setDescription(description);

  return [embed];
};

const noCarExists = (carId: string) => ({
  embeds: noCarExistsEmbeds(carId),
  ephemeral: true,
});
// endregion

// region Compare Cars
// region Components
// region Swap
const swapButton = ({ sessionId }: Context, isLoading: boolean) =>
  new ButtonBuilder()
    .setCustomId(`${UIID.SwapButton}${sessionId}`)
    .setDisabled(isLoading)
    .setEmoji("🔁")
    .setLabel("| Swap")
    .setStyle(ButtonStyle.Primary);

const swapActionRow = (context: Context, isLoading: boolean) =>
  new ActionRowBuilder<ButtonBuilder>().setComponents(
    swapButton(context, isLoading),
  );
// endregion

// region Prospective
const frontButton = ({ prospective, sessionId }: Context, isLoading: boolean) =>
  new ButtonBuilder()
    .setCustomId(`${UIID.FrontButton}${sessionId}`)
    .setDisabled(prospective === Prospective.Front || isLoading)
    .setEmoji("🚘")
    .setLabel("| Front")
    .setStyle(ButtonStyle.Secondary);

const sideButton = ({ prospective, sessionId }: Context, isLoading: boolean) =>
  new ButtonBuilder()
    .setCustomId(`${UIID.SideButton}${sessionId}`)
    .setDisabled(prospective === Prospective.Side || isLoading)
    .setEmoji("🚗")
    .setLabel("| Side")
    .setStyle(ButtonStyle.Secondary);

const rearButton = ({ prospective, sessionId }: Context, isLoading: boolean) =>
  new ButtonBuilder()
    .setCustomId(`${UIID.RearButton}${sessionId}`)
    .setDisabled(prospective === Prospective.Rear || isLoading)
    .setEmoji("🍑")
    .setLabel("| Rear")
    .setStyle(ButtonStyle.Secondary);

const prospectiveActionRow = (context: Context, isLoading: boolean) =>
  new ActionRowBuilder<ButtonBuilder>().setComponents(
    frontButton(context, isLoading),
    sideButton(context, isLoading),
    rearButton(context, isLoading),
  );
// endregion

// region Units
const metricButton = ({ sessionId, units }: Context, isLoading: boolean) =>
  new ButtonBuilder()
    .setCustomId(`${UIID.MetricButton}${sessionId}`)
    .setDisabled(units === Units.Metric || isLoading)
    .setEmoji("🤓")
    .setLabel("| Metric")
    .setStyle(ButtonStyle.Secondary);

const imperialButton = ({ sessionId, units }: Context, isLoading: boolean) =>
  new ButtonBuilder()
    .setCustomId(`${UIID.ImperialButton}${sessionId}`)
    .setDisabled(units === Units.Imperial || isLoading)
    .setEmoji("🚀")
    .setLabel("| Imperial")
    .setStyle(ButtonStyle.Secondary);

const unitsActionRow = (context: Context, isLoading: boolean) =>
  new ActionRowBuilder<ButtonBuilder>().setComponents(
    metricButton(context, isLoading),
    imperialButton(context, isLoading),
  );
// endregion

const compareCarsComponents = (context: Context, isLoading: boolean) => [
  swapActionRow(context, isLoading),
  prospectiveActionRow(context, isLoading),
  unitsActionRow(context, isLoading),
];
// endregion

const compareCarsContent = (
  { firstCar, secondCar }: Context,
  isLoading: boolean,
) => {
  if (isLoading) return `${Environment.ProjectName} is thinking...`;

  const firstCarName = carsized.toName(firstCar);
  const secondCarName = carsized.toName(secondCar);
  return `${bold(firstCarName)} vs. ${bold(secondCarName)}`;
};

const compareCars = (context: Context, files?: BaseMessageOptions["files"]) => {
  const isLoading = files === undefined;

  return {
    components: compareCarsComponents(context, isLoading),
    content: compareCarsContent(context, isLoading),
    files,
  };
};
// endregion

export default {
  compareCars,
  noCarExists,
};
