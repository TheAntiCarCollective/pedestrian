import assert from "node:assert";

import { CreatorType, subscribe } from "../../../../creators";
import { registerComponent } from "../../../../shared/discord";
import { isNonNullable } from "../../../../shared/nullable";
import session, * as withContext from "../context";
import { UIID } from "../ui";

registerComponent(UIID.SubscribeButton, async (interaction, sessionId) => {
  const context = await session.read(sessionId);

  const { channelId } = withContext.getYoutubeChannel(context);
  assert(isNonNullable(channelId));
  const name = withContext.getName(context);

  const response = await subscribe({
    channelId: context.channelId,
    creatorDomainId: channelId,
    creatorType: CreatorType.YouTube,
    interaction,
    name,
  });

  await session.destroy(sessionId);
  return response;
});
