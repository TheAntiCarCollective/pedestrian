import type { InteractionReplyOptions } from "discord.js";
import assert from "node:assert";

import { registerComponent } from "../../../../services/discord";

import ComponentId from "./index";
import * as ui from "../ui";
import * as database from "../database";
import { CreatorType } from "../../constants";
import * as youtube from "../../youtube";

const youtubeDescriptionUi = async (videoId: string) => {
  const video = await youtube.getVideo(videoId);
  const { snippet: videoSnippet } = video;
  const { channelId } = videoSnippet ?? {};

  assert(typeof channelId === "string");
  const channel = await youtube.getChannel(channelId);

  return ui.youtubeDescription(videoId, video, channel);
};

registerComponent(
  ComponentId.DescriptionButton,
  async (interaction, legacyVideoId) => {
    let options: InteractionReplyOptions;
    if (legacyVideoId === "") {
      const { message } = interaction;
      const { id: postId } = message;
      const { contentId, creatorType } = await database.getCreatorPost(postId);

      switch (creatorType) {
        case CreatorType.YouTube:
          options = await youtubeDescriptionUi(contentId);
          break;
      }
    } else {
      options = await youtubeDescriptionUi(legacyVideoId);
    }

    return interaction.reply(options);
  },
);
