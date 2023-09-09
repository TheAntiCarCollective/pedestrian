import type { PoolClient } from "pg";
import assert from "node:assert";

import { useTransaction } from "../../services/postgresql";

import type { Choice, Question, Survey } from "./types";
import { QuestionType } from "./constants";

// region Types
type SurveyCompositeKey = {
  guildId: string;
  title: string;
};

type PartialSurvey = Omit<Survey, "questions">;

type PartialQuestion = {
  id: number;
  type: QuestionType;
  ask: string;
  description: string;
  minValues: number | null;
  maxValues: number | null;
};

type ChoiceRow = {
  questionId: number;
  choices: [Choice["label"], Choice["description"]][];
};
// endregion

// region getSurvey
const getPartialSurvey = async (
  client: PoolClient,
  id: SurveyCompositeKey | string,
) => {
  let query: string;
  let values: string[];

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
      array_agg(
        array[sqc.label, sqc.description]
        order by sqc.id
      ) as "choices"
    from survey_question_choice as sqc
    inner join survey_question as sq
      on sq.id = sqc.survey_question_id
    where sq.survey_id = $1
    group by sq.id
  `;

  const values = [surveyId];
  const { rows } = await client.query<ChoiceRow>(query, values);

  return rows.reduce((map, { questionId, choices: rawChoices }) => {
    const choices = rawChoices.map((properties) => ({
      label: properties[0],
      description: properties[1],
    }));

    return map.set(questionId, choices);
  }, new Map<number, Choice[]>());
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

  const questions: Question[] = [];
  for (const row of rows) {
    const {
      id: questionId,
      type,
      ask,
      description,
      minValues,
      maxValues,
    } = row;

    switch (type) {
      case QuestionType.MultipleChoice: {
        const choices = groupedChoices.get(questionId);
        assert(choices !== undefined);
        assert(minValues !== null);
        assert(maxValues !== null);

        questions.push({
          type,
          ask,
          description,
          minValues,
          maxValues,
          choices,
        });

        break;
      }
      case QuestionType.OpenAnswer:
        questions.push({
          type,
          ask,
          description,
        });

        break;
    }
  }

  return questions;
};

export const getSurvey = (id: SurveyCompositeKey | string) =>
  useTransaction(async (client) => {
    const partialSurvey = await getPartialSurvey(client, id);
    if (partialSurvey === undefined) return undefined;
    const questions = await getQuestions(client, partialSurvey.id);

    return {
      ...partialSurvey,
      questions,
    };
  });
// endregion
