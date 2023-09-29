import type { ChatInputCommandInteraction } from "discord.js";

import { GuildMember, PermissionFlagsBits } from "discord.js";
import assert from "node:assert";

import { InitialQuestion } from "../constants";
import session from "./context";
import * as database from "./database";
import UI from "./ui";

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

  const { roles: guildMemberRoleManager } = member;
  const roles = guildMemberRoleManager.valueOf();

  if (memberPermissions.has(PermissionFlagsBits.ManageMessages)) return;
  const surveyCreatorRoleId = await database.getSurveyCreatorRoleId(guildId);
  if (surveyCreatorRoleId !== null && roles.has(surveyCreatorRoleId)) return;

  return interaction.reply(UI.permissionsDenied(surveyCreatorRoleId));
};

export default async (interaction: ChatInputCommandInteraction) => {
  const { channelId, guildId, options, user } = interaction;
  assert(guildId !== null);

  const response = await checkPermissionsResponse(interaction);
  if (response !== undefined) return response;

  const title = options.getString(Option.Title, true);
  const survey = await database.getSurvey(guildId, title);
  if (survey !== undefined) return interaction.reply(UI.surveyExists(survey));

  const partialContext = {
    selectedChoiceIndex: 0,
    selectedQuestionIndex: 0,
    survey: {
      channelId,
      createdBy: user.id,
      description: "",
      guildId,
      questions: [InitialQuestion],
      title,
    },
  };

  const context = await session.create(partialContext, interaction);
  await interaction.showModal(UI.questionModal(context));
};
