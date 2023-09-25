import { useClient } from "../../../../services/postgresql";

// region Types
type SurveyCreatorRoleId = {
  surveyCreatorRoleId: string | null;
};
// endregion

export const getSurveyCreatorRoleId = (guildId: string) =>
  useClient(`${__filename}#getSurveyCreatorRoleId`, async (client) => {
    const query = `
      select survey_creator_role_id as "surveyCreatorRoleId"
      from guild
      where id = $1
    `;

    const values = [guildId];
    const { rows } = await client.query<SurveyCreatorRoleId>(query, values);

    const { surveyCreatorRoleId } = rows[0] ?? {};
    return surveyCreatorRoleId ?? null;
  });

export const setSurveyCreatorRoleId = (
  guildId: string,
  surveyCreatorRoleId: string | null,
) =>
  useClient(`${__filename}#setSurveyCreatorRoleId`, (client) => {
    const query = `
      update guild
      set survey_creator_role_id = $2
      where id = $1
    `;

    const values = [guildId, surveyCreatorRoleId];
    return client.query(query, values);
  });
