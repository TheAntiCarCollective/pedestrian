import type { BaseInteraction } from "discord.js";

import { messageLink } from "discord.js";
import assert from "node:assert";

import type {
  Answer,
  MultipleChoiceQuestion,
  OpenAnswer,
  OpenAnswerQuestion,
  PartialSurvey,
  Question,
  SelectedAnswers,
  SkippedAnswer,
  Survey,
} from "./types";

import * as observability from "../../shared/observability";
import { QuestionType } from "./constants";

// region Logger
const logger = observability.logger(module);
// endregion

// region Survey
export const surveyLink = ({ channelId, guildId, id }: PartialSurvey) =>
  messageLink(channelId, id, guildId);

export const surveyCreator = async (
  survey: Survey,
  interaction: BaseInteraction,
) => {
  const { guild } = interaction;
  assert(guild !== null);
  const { members } = guild;

  try {
    return await members.fetch(survey.createdBy);
  } catch (error) {
    logger.info(error, "GET_SURVEY_CREATOR_ERROR");
    return;
  }
};
// endregion

// region Question
export const isMultipleChoice = (
  question: Question,
): question is MultipleChoiceQuestion =>
  question.type === QuestionType.MultipleChoice;

export const isOpenAnswer = (
  question: Question,
): question is OpenAnswerQuestion =>
  // prettier-ignore
  question.type === QuestionType.OpenAnswer;
// endregion

// region Answer
export const isSkipped = (answer: Answer): answer is SkippedAnswer =>
  answer === null;

export const isOpen = (answer: Answer): answer is OpenAnswer =>
  typeof answer === "string";

export const isSelected = (answer: Answer): answer is SelectedAnswers =>
  Array.isArray(answer);
// endregion
