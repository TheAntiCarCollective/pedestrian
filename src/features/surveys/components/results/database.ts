import { useClient } from "../../../../services/postgresql";

import type { Answer } from "../../types";

// region Types
type Answers = {
  answers: Answer[];
};
// endregion

export const getResults = (surveyId: string) =>
  useClient(async (client) => {
    const query = `
      select
        array_agg(
          sa.answer
          order by sa.id
        ) as answers
      from survey_answer as sa
      inner join survey_question as sq
        on sq.id = sa.survey_question_id
      where sq.survey_id = $1
      group by sq.id
      order by sq.id
    `;

    const values = [surveyId];
    const { rows } = await client.query<Answers>(query, values);
    return rows.map(({ answers }) => answers);
  });
