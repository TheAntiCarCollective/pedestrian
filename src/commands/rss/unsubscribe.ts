import type { ChatInputCommandInteraction } from "discord.js";

import { CreatorType, unsubscribe } from "../../creators";
import * as rss from "./rss";

export default (interaction: ChatInputCommandInteraction) =>
  unsubscribe(interaction, CreatorType.RSS, async (creatorDomainId) => {
    const { title } = await rss.getFeed(creatorDomainId);
    return title ?? creatorDomainId;
  });
