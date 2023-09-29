import assert from "node:assert";

import { isNonNullable } from "../../../../helpers";
import { registerComponent } from "../../../../services/discord";
import * as youtube from "../../youtube";
import * as database from "../database";
import UI, { UIID } from "../ui";

registerComponent(UIID.DescriptionButton, async (interaction, videoId) => {
  // Support legacy buttons
  if (videoId === "") {
    const { message } = interaction;
    const { id: postId } = message;
    videoId = await database.getContentId(postId);
  }

  const video = await youtube.getVideo(videoId);
  const { snippet: videoSnippet } = video;
  const { channelId } = videoSnippet ?? {};
  assert(isNonNullable(channelId));
  const channel = await youtube.getChannel(channelId);

  return interaction.reply(UI.description(videoId, video, channel));
});
