import assert from "node:assert";

import { caller } from "../../../helpers";
import { useClient } from "../../../services/postgresql";

// region Types
type ContentId = {
  contentId: string;
};
// endregion

export const getContentId = (postId: string) =>
  useClient(caller(module, getContentId), async (client) => {
    const query = `
      select content_id as "contentId"
      from creator_post
      where id = $1
    `;

    const values = [postId];
    const { rows } = await client.query<ContentId>(query, values);

    const { contentId } = rows[0] ?? {};
    assert(contentId !== undefined);
    return contentId;
  });
