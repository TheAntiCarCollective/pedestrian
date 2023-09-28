import type {
  CommandInteraction,
  MessageComponentInteraction,
} from "discord.js";
import { CategoryChannel, ThreadChannel } from "discord.js";
import assert from "node:assert";

import Environment from "../../environment";
import { isUnique } from "../../helpers";

import UI from "./ui";
import * as subscribeDatabase from "./database";
import * as creatorsDatabase from "../database";
import { CreatorType } from "../constants";

// region Types
type Subscribe = {
  interaction: CommandInteraction | MessageComponentInteraction;
  name: string;
  creatorType: CreatorType;
  creatorDomainId: string;
  channelId: string;
};
// endregion

export const checkSubscribeRequirements = async (
  interaction: CommandInteraction,
  name: string,
  creatorType: CreatorType,
) => {
  const { guild } = interaction;
  assert(guild !== null);
  const { channels: guildChannelManager, id: guildId } = guild;

  const creatorSubscriptions =
    // prettier-ignore
    await subscribeDatabase.getCreatorSubscriptions(creatorType, guildId);

  const channels = guildChannelManager.valueOf();
  const obsoleteCreatorChannelIds = creatorSubscriptions
    .map(({ creatorChannelId }) => creatorChannelId)
    .filter(isUnique)
    .filter((creatorChannelId) => !channels.has(creatorChannelId));

  if (obsoleteCreatorChannelIds.length > 0)
    await creatorsDatabase.deleteCreatorChannels(obsoleteCreatorChannelIds);

  let { length: numberOfCreatorSubscriptions } = creatorSubscriptions;
  const { length: numberOfObsoleteCreatorSubscriptions } =
    creatorSubscriptions.filter(({ creatorChannelId }) =>
      obsoleteCreatorChannelIds.includes(creatorChannelId),
    );

  numberOfCreatorSubscriptions -= numberOfObsoleteCreatorSubscriptions;
  return numberOfCreatorSubscriptions < 25
    ? undefined
    : interaction.reply(UI.maxCreatorSubscriptions(creatorType, name));
};

export const subscribe = async ({
  interaction,
  name,
  creatorType,
  creatorDomainId,
  channelId,
}: Subscribe) => {
  const { guild } = interaction;
  assert(guild !== null);
  const { channels: guildChannelManager, id: guildId } = guild;

  const creatorChannels = await subscribeDatabase.getCreatorChannels(guildId);
  let creatorChannel = creatorChannels.find(({ id }) => id === channelId);

  if (creatorChannel === undefined) {
    const channels = guildChannelManager.valueOf();
    const channel = channels.get(channelId);
    assert(channel !== undefined);
    assert(!(channel instanceof CategoryChannel));

    let parentId: string | null = null;
    let webhookId;
    let webhookToken;

    if (channel instanceof ThreadChannel) {
      const { parent } = channel;
      assert(parent !== null);

      parentId = parent.id;
      const creatorChannel = creatorChannels.find(({ id }) => id === parentId);

      if (creatorChannel === undefined) {
        const webhook = await parent.createWebhook({
          name: Environment.ProjectName,
        });

        webhookId = webhook.id;
        webhookToken = webhook.token;
        assert(webhookToken !== null);
      } else {
        webhookId = creatorChannel.webhookId;
        webhookToken = creatorChannel.webhookToken;
      }
    } else {
      const webhook = await channel.createWebhook({
        name: Environment.ProjectName,
      });

      webhookId = webhook.id;
      webhookToken = webhook.token;
      assert(webhookToken !== null);
    }

    creatorChannel = {
      id: channelId,
      parentId,
      webhookId,
      webhookToken,
    };
  }

  await subscribeDatabase.createCreatorSubscription({
    type: creatorType,
    domainId: creatorDomainId,
    guildId,
    ...creatorChannel,
  });

  return interaction.isCommand()
    ? interaction.reply({
        ...UI.subscribed(name, channelId),
        content: undefined,
      })
    : interaction.update({
        ...UI.subscribed(name, channelId),
        content: "",
      });
};
