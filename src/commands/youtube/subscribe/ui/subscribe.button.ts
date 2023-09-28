import assert from "node:assert";

import { registerComponent } from "../../../../services/discord";
import { CreatorType, subscribe } from "../../../../creators";
import { isNonNullable } from "../../../../helpers";

import { UIID } from "../ui";
import session, * as withContext from "../context";

registerComponent(UIID.SubscribeButton, async (interaction, sessionId) => {
  const context = await session.read(sessionId);

  const { channelId } = withContext.getYoutubeChannel(context);
  assert(isNonNullable(channelId));
  const name = withContext.getName(context);

  const response = await subscribe({
    interaction,
    name,
    creatorType: CreatorType.YouTube,
    creatorDomainId: channelId,
    channelId: context.channelId,
  });

  await session.destroy(sessionId);
  return response;
});
