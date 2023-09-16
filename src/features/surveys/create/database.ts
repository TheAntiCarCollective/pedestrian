import type { PoolClient } from "pg";

import { useClient, useTransaction } from "../../../services/postgresql";
import { isNonNullable } from "../../../helpers/array";

import type { PartialSurvey, Question, Survey } from "../types";
import { isMultipleChoice } from "../functions";

export const getSurvey = (guildId: string, title: string) =>
  useClient(`${__filename}#getSurvey`, async (client) => {
    const query = `
      select
        id,
        guild_id as "guildId",
        title,
        channel_id as "channelId"
      from survey
      where guild_id = $1
        and title = $2
    `;

    const values = [guildId, title];
    const { rows } = await client.query<PartialSurvey>(query, values);
    return rows[0];
  });

const createQuestions = (
  client: PoolClient,
  surveyId: string,
  rawQuestions: Question[],
) => {
  const query = `
    insert into survey_question(type, survey_id, ask, description, min_values, max_values)
    select
      q.type,
      $1 as survey_id,
      q.ask,
      q.description,
      q."minValues" as min_values,
      q."maxValues" as max_values
    from jsonb_to_recordset($2::jsonb) as q(
      type survey_question_type,
      ask text,
      description text,
      "minValues" int,
      "maxValues" int
    )
  `;

  const questions = rawQuestions.map((rawQuestion) => {
    const { type, ask, description } = rawQuestion;
    const minValues = isMultipleChoice(rawQuestion)
      ? rawQuestion.minValues
      : null;
    const maxValues = isMultipleChoice(rawQuestion)
      ? rawQuestion.maxValues
      : null;

    return {
      type,
      ask,
      description,
      minValues,
      maxValues,
    };
  });

  const questionsJson = JSON.stringify(questions);
  const values = [surveyId, questionsJson];
  return client.query(query, values);
};

const createChoices = (
  client: PoolClient,
  surveyId: string,
  questions: Question[],
) => {
  const query = `
    insert into survey_question_choice(survey_question_id, label, description)
    select
      sq.id as survey_question_id,
      c.label,
      c.description
    from
      jsonb_to_recordset($2::jsonb) as c(
        "questionIndex" int,
        label text,
        description text
      ) cross join lateral(
        select id
        from survey_question
        where survey_id = $1
        order by id
        limit 1
        offset c."questionIndex"
      ) as sq
  `;

  const choices = questions
    .flatMap((question, questionIndex) => {
      if (isMultipleChoice(question)) {
        const { choices } = question;
        return choices.map((choice) => ({
          questionIndex,
          ...choice,
        }));
      }

      return undefined;
    })
    .filter(isNonNullable);

  const choicesJson = JSON.stringify(choices);
  const values = [surveyId, choicesJson];
  return client.query(query, values);
};

export const createSurvey = ({
  id: surveyId,
  guildId,
  title,
  description,
  channelId,
  createdBy,
  questions,
}: Survey) =>
  useTransaction(`${__filename}#createSurvey`, async (client) => {
    const query = `
      insert into survey(id, guild_id, title, description, channel_id, created_by)
      values($1, $2, $3, $4, $5, $6)
    `;

    const values = [
      surveyId,
      guildId,
      title,
      description,
      channelId,
      createdBy,
    ];

    await client.query(query, values);
    await createQuestions(client, surveyId, questions);
    return createChoices(client, surveyId, questions);
  });
