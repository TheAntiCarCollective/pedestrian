import type { Answer } from "../../types";

import { useClient } from "../../../../services/postgresql";

// region Types
type AnswerRow = {
  answer: Answer;
};
// endregion

export const getAnswers = (surveyId: string, createdBy: string) =>
  useClient(`${__filename}#getAnswers`, async (client) => {
    const query = `
      select sa.answer
      from survey_answer as sa
      inner join survey_question as sq
        on sq.id = sa.survey_question_id
      where
        sq.survey_id = $1
        and sa.created_by = $2
      order by sq.id
    `;

    const values = [surveyId, createdBy];
    const { rows } = await client.query<AnswerRow>(query, values);
    return rows.map(({ answer }) => answer);
  });

export const createAnswers = (
  surveyId: string,
  createdBy: string,
  answers: Answer[],
) =>
  useClient(`${__filename}#createAnswers`, async (client) => {
    const query = `
      insert into survey_answer(survey_question_id, created_by, answer)
      select
        id as survey_question_id,
        $2 as created_by,
        $3::jsonb -> (row_number() over (order by id) - 1)::int as answer
      from survey_question
      where survey_id = $1
      order by id
      on conflict(survey_question_id, created_by) do update
      set answer = excluded.answer
    `;

    const answersJson = JSON.stringify(answers);
    const values = [surveyId, createdBy, answersJson];
    return client.query(query, values);
  });
