import type { PoolClient } from "pg";

import assert from "node:assert";

import type { Choice, Survey } from "./types";

import { caller } from "../../helpers";
import { useTransaction } from "../../services/postgresql";
import { QuestionType } from "./constants";

// region Types
type SurveyCompositeKey = {
  guildId: string;
  title: string;
};

type PartialSurvey = Omit<Survey, "questions">;

type PartialQuestion = {
  ask: string;
  description: string;
  id: number;
  maxValues: null | number;
  minValues: null | number;
  type: QuestionType;
};

type ChoiceRow = {
  description: string;
  label: string;
  questionId: number;
};
// endregion

// region getSurvey
const getPartialSurvey = async (
  client: PoolClient,
  id: SurveyCompositeKey | string,
) => {
  let query;
  let values;

  if (typeof id === "string") {
    query = `
      select
        id,
        guild_id as "guildId",
        title,
        description,
        channel_id as "channelId",
        created_by as "createdBy"
      from survey
      where id = $1
    `;

    values = [id];
  } else {
    query = `
      select
        id,
        guild_id as "guildId",
        title,
        description,
        channel_id as "channelId",
        created_by as "createdBy"
      from survey
      where guild_id = $1
        and title = $2
    `;

    values = [id.guildId, id.title];
  }

  const { rows } = await client.query<PartialSurvey>(query, values);
  return rows[0];
};

const getGroupedChoices = async (client: PoolClient, surveyId: string) => {
  const query = `
    select
      sq.id as "questionId",
      sqc.label,
      sqc.description
    from survey_question_choice as sqc
    inner join survey_question as sq
      on sq.id = sqc.survey_question_id
    where sq.survey_id = $1
    order by
      sqc.id
  `;

  const values = [surveyId];
  const { rows } = await client.query<ChoiceRow>(query, values);

  const groupedChoices: Record<number, Choice[]> = {};
  for (const { questionId, ...choice } of rows) {
    const choices = groupedChoices[questionId] ?? [];
    choices.push(choice);
    groupedChoices[questionId] = choices;
  }

  return groupedChoices;
};

const getQuestions = async (client: PoolClient, surveyId: string) => {
  const query = `
    select
      id,
      type,
      ask,
      description,
      min_values as "minValues",
      max_values as "maxValues"
    from survey_question
    where survey_id = $1
    order by id
  `;

  const values = [surveyId];
  const { rows } = await client.query<PartialQuestion>(query, values);
  const groupedChoices = await getGroupedChoices(client, surveyId);

  const questions = [];
  for (const row of rows) {
    const {
      ask,
      description,
      id: questionId,
      maxValues,
      minValues,
      type,
    } = row;

    switch (type) {
      case QuestionType.MultipleChoice: {
        const choices = groupedChoices[questionId];
        assert(choices !== undefined);
        assert(minValues !== null);
        assert(maxValues !== null);

        questions.push({
          ask,
          choices,
          description,
          maxValues,
          minValues,
          type,
        });

        break;
      }
      case QuestionType.OpenAnswer: {
        questions.push({
          ask,
          description,
          type,
        });

        break;
      }
    }
  }

  return questions;
};

export const getSurvey = (id: SurveyCompositeKey | string) =>
  useTransaction(caller(module, getSurvey), async (client) => {
    const partialSurvey = await getPartialSurvey(client, id);
    if (partialSurvey === undefined) return;
    const questions = await getQuestions(client, partialSurvey.id);

    return {
      ...partialSurvey,
      questions,
    };
  });
// endregion
