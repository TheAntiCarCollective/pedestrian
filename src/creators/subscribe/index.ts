import type {
  CommandInteraction,
  MessageComponentInteraction,
} from "discord.js";

import { CategoryChannel, ThreadChannel } from "discord.js";
import assert from "node:assert";

import type { CreatorType } from "../constants";

import { unique } from "../../shared/array";
import Environment from "../../shared/environment";
import * as creatorsDatabase from "../database";
import * as subscribeDatabase from "./database";
import UI from "./ui";

// region Types
type Subscribe = {
  channelId: string;
  creatorDomainId: string;
  creatorType: CreatorType;
  interaction: CommandInteraction | MessageComponentInteraction;
  name: string;
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
    .filter(unique())
    .filter((creatorChannelId) => !channels.has(creatorChannelId));

  if (obsoleteCreatorChannelIds.length > 0)
    await creatorsDatabase.deleteCreatorChannels(obsoleteCreatorChannelIds);

  let { length: numberOfCreatorSubscriptions } = creatorSubscriptions;
  const { length: numberOfObsoleteCreatorSubscriptions } =
    creatorSubscriptions.filter(({ creatorChannelId }) =>
      obsoleteCreatorChannelIds.includes(creatorChannelId),
    );

  numberOfCreatorSubscriptions -= numberOfObsoleteCreatorSubscriptions;
  return numberOfCreatorSubscriptions < 100
    ? undefined
    : interaction.reply(UI.maxCreatorSubscriptions(creatorType, name));
};

export const subscribe = async ({
  channelId,
  creatorDomainId,
  creatorType,
  interaction,
  name,
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

    let parentId: null | string = null;
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
    domainId: creatorDomainId,
    guildId,
    type: creatorType,
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
