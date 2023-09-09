import type { ChatInputCommandInteraction } from "discord.js";
import { GuildMember, PermissionFlagsBits } from "discord.js";
import assert from "node:assert";

import guildSettings from "../../bot/settings/guild";
import * as session from "../../../session";

import type Context from "./context";
import * as ui from "./ui";
import * as database from "./database";
import { InitialQuestion } from "../constants";

// Install
import "./components/addChoice.button";
import "./components/addQuestion.button";
import "./components/cancel.button";
import "./components/choice.modal";
import "./components/choice.select";
import "./components/choiceSettings.modal";
import "./components/create.button";
import "./components/createSurvey.modal";
import "./components/editChoice.button";
import "./components/editChoiceSettings.button";
import "./components/editQuestion.button";
import "./components/nextQuestion.button";
import "./components/previousQuestion.button";
import "./components/question.modal";
import "./components/questionType.select";
import "./components/removeChoice.button";
import "./components/removeQuestion.button";

export enum Option {
  Title = "title",
}

const checkPermissionsResponse = async (
  interaction: ChatInputCommandInteraction,
) => {
  const { guildId, member, memberPermissions } = interaction;
  assert(guildId !== null);
  assert(member instanceof GuildMember);
  assert(memberPermissions !== null);

  if (memberPermissions.has(PermissionFlagsBits.ManageMessages))
    return undefined;

  const { surveyCreatorRoleId } = await guildSettings(guildId);
  const { roles: guildMemberRoleManager } = member;
  const roles = guildMemberRoleManager.valueOf();

  if (surveyCreatorRoleId !== null && roles.has(surveyCreatorRoleId))
    return undefined;

  return interaction.reply(ui.permissionsDenied(surveyCreatorRoleId));
};

export default async (interaction: ChatInputCommandInteraction) => {
  const { channelId, guildId, options, user } = interaction;
  assert(guildId !== null);

  const response = await checkPermissionsResponse(interaction);
  if (response !== undefined) return response;

  const title = options.getString(Option.Title, true);
  const survey = await database.getSurvey(guildId, title);
  if (survey !== undefined) return interaction.reply(ui.surveyExists(survey));

  const partialContext = {
    selectedQuestionIndex: 0,
    selectedChoiceIndex: 0,
    survey: {
      guildId,
      title,
      description: "",
      channelId,
      createdBy: user.id,
      questions: [InitialQuestion],
    },
  };

  const context = await session.create<Context>(partialContext, interaction);
  await interaction.showModal(ui.questionModal(context));
  return undefined;
};
