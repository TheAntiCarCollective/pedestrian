import assert from "node:assert";

import { registerComponent } from "../../../../services/discord";
import { isNonNullable } from "../../../../helpers";

import * as ui from "./index";
import { UIID } from "./constants";
import * as database from "../database";
import * as youtube from "../../youtube";

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

  return interaction.reply(ui.description(videoId, video, channel));
});
