import type { GuildChannelManager } from "discord.js";
import { CategoryChannel, ThreadChannel } from "discord.js";
import assert from "node:assert";

import { registerComponent } from "../../../../services/discord";
import Environment from "../../../../environment";
import * as session from "../../../../session";

import ComponentId from "./index";
import type Context from "../context";
import * as withContext from "../context";
import * as database from "../database";
import * as ui from "../ui";
import { CreatorType } from "../../constants";

// region Types
type Webhook = {
  id: string;
  token: string;
};
// endregion

const createCreatorChannels = async (
  guildChannelManager: GuildChannelManager,
  { selectedChannelIds }: Context,
) => {
  const { guild } = guildChannelManager;
  const { id: guildId } = guild;

  const existingCreatorChannels = await database.getCreatorChannels(guildId);
  const existingCreatorChannelIds = existingCreatorChannels.map(({ id }) => id);
  const existingWebhooks = existingCreatorChannels.reduce(
    (map, { id, parentId, webhookId, webhookToken }) => {
      const webhook = { id: webhookId, token: webhookToken };
      if (parentId !== null) map.set(parentId, webhook);
      return map.set(id, webhook);
    },
    new Map<string, Webhook>(),
  );

  // It is possible 2 creator channel IDs are threads of the same channel where
  // a webhook will be created. This makes the loop sequentially dependent
  // which means optimizations such as parallelization (mapping each index to a
  // Promise) not possible.

  for (const id of selectedChannelIds) {
    if (existingCreatorChannelIds.includes(id)) continue;

    const channel = await guildChannelManager.fetch(id);
    assert(channel !== null);
    assert(!(channel instanceof CategoryChannel));

    let parentId: string | null = null;
    let webhookId: string;
    let webhookToken: string | null;

    if (channel instanceof ThreadChannel) {
      const { parent } = channel;
      assert(parent !== null);

      parentId = parent.id;
      const webhook = existingWebhooks.get(parentId);

      if (webhook === undefined) {
        const webhook = await parent.createWebhook({
          name: Environment.ProjectName,
        });

        webhookId = webhook.id;
        webhookToken = webhook.token;
      } else {
        webhookId = webhook.id;
        webhookToken = webhook.token;
      }
    } else {
      const webhook = await channel.createWebhook({
        name: Environment.ProjectName,
      });

      webhookId = webhook.id;
      webhookToken = webhook.token;
    }

    assert(webhookToken !== null);
    const webhook = { id: webhookId, token: webhookToken };

    existingWebhooks.set(id, webhook);
    if (parentId !== null) existingWebhooks.set(parentId, webhook);
    const { type } = channel;

    await database.createCreatorChannel({
      id,
      type,
      guildId,
      parentId,
      webhookId,
      webhookToken,
    });
  }
};

registerComponent(ComponentId.ApplyButton, async (interaction, sessionId) => {
  const { guild } = interaction;
  assert(guild !== null);
  const { channels: guildChannelManager } = guild;

  const context = await session.destroy<Context>(sessionId);
  await createCreatorChannels(guildChannelManager, context);

  const { channelId } = withContext.getYoutubeChannel(context);
  assert(typeof channelId === "string");

  await database.createCreatorSubscriptions({
    domainId: channelId,
    creatorType: CreatorType.YouTube,
    creatorChannelIds: context.selectedChannelIds,
  });

  return interaction.update(ui.subscribed(context));
});
