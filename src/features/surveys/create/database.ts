import assert from "node:assert";

import { useClient, useTransaction } from "../../../services/postgresql";

import type { PartialSurvey, Survey } from "../types";
import { QuestionType } from "../constants";

// region Types
type QuestionId = {
  id: number;
};
// endregion

export const getSurvey = (guildId: string, title: string) =>
  useClient(async (client) => {
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

export const createSurvey = ({
  id: surveyId,
  guildId,
  title,
  description,
  channelId,
  createdBy,
  questions,
}: Survey) =>
  useTransaction(async (client) => {
    const query = `
      insert into survey(id, guild_id, title, description, channel_id, created_by)
      values($1, $2, $3, $4, $5, $6)
    `;

    await client.query(query, [
      surveyId,
      guildId,
      title,
      description,
      channelId,
      createdBy,
    ]);

    for (const question of questions) {
      const { type, ask, description } = question;
      switch (type) {
        case QuestionType.MultipleChoice: {
          const query = `
            insert into survey_question(type, survey_id, ask, description, min_values, max_values)
            values ($1, $2, $3, $4, $5, $6)
            returning id
          `;

          const { minValues, maxValues, choices } = question;
          const { rows } = await client.query<QuestionId>(query, [
            type,
            surveyId,
            ask,
            description,
            minValues,
            maxValues,
          ]);

          const { id: questionId } = rows[0] ?? {};
          assert(questionId !== undefined);

          for (const { label, description } of choices) {
            const query = `
              insert into survey_question_choice(survey_question_id, label, description)
              values ($1, $2, $3)
            `;

            const values = [questionId, label, description];
            await client.query(query, values);
          }

          break;
        }
        case QuestionType.OpenAnswer: {
          const query = `
            insert into survey_question(type, survey_id, ask, description)
            values($1, $2, $3, $4)
          `;

          const values = [type, surveyId, ask, description];
          await client.query(query, values);
          break;
        }
      }
    }
  });
