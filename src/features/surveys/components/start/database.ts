import { useClient, useTransaction } from "../../../../services/postgresql";

import type { Answer } from "../../types";

// region Types
type AnswerRow = {
  answer: Answer;
};
// endregion

export const getAnswers = (surveyId: string, createdBy: string) =>
  useClient(async (client) => {
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
  useTransaction(async (client) => {
    let query = `
      delete from survey_answer sa
      using survey_question sq
      where sq.id = sa.survey_question_id
        and sq.survey_id = $1
        and sa.created_by = $2
    `;

    let values: unknown[] = [surveyId, createdBy];
    await client.query(query, values);

    query = `
      insert into survey_answer(survey_question_id, created_by, answer)
      select
        id as survey_question_id,
        $2 as createdBy,
        ($3::jsonb)[cast(row_number() over(order by id) as int) - 1] as answer
      from survey_question
      where survey_id = $1
      order by id
    `;

    values = [surveyId, createdBy, JSON.stringify(answers)];
    return client.query(query, values);
  });
