import type { ChatInputCommandInteraction } from "discord.js";

import { CreatorType, unsubscribe } from "../../../creators";
import * as youtube from "../youtube";

export default (interaction: ChatInputCommandInteraction) =>
  unsubscribe(interaction, CreatorType.YouTube, async (creatorDomainId) => {
    const { snippet } = await youtube.getChannel(creatorDomainId);
    const { title } = snippet ?? {};
    return title ?? creatorDomainId;
  });
