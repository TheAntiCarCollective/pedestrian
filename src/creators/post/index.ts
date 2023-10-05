import type { APIMessage } from "discord.js";

import { CronJob } from "cron";
import {
  ChannelType,
  DiscordAPIError,
  Events,
  WebhookClient,
  roleMention,
} from "discord.js";
import assert from "node:assert";
import loggerFactory from "pino";

import type { CreatorType } from "../constants";
import type { CreatorSubscription, Option } from "./database";

import { isUnique } from "../../helpers";
import discord from "../../services/discord";
import * as creatorsDatabase from "../database";
import * as postDatabase from "./database";

// region Types
type Poster = (creatorSubscription: CreatorSubscription) => Promise<Option[]>;
// endregion

const logger = loggerFactory({
  name: __filename,
});

const posters = new Map<CreatorType, Poster>();
export const registerPoster = (creatorType: CreatorType, poster: Poster) => {
  assert(!posters.has(creatorType));
  posters.set(creatorType, poster);
};

const getChannel = async ({
  creatorChannelId,
  guildId,
}: CreatorSubscription) => {
  const { guilds } = discord;
  const { channels } = await guilds.fetch(guildId);
  const channel = await channels.fetch(creatorChannelId);
  assert(channel !== null);
  return channel;
};

const getOptions = async (creatorSubscription: CreatorSubscription) => {
  const poster = posters.get(creatorSubscription.creatorType);
  assert(poster !== undefined);

  try {
    const options = await poster(creatorSubscription);
    const contentIds = options.map(({ contentId }) => contentId);
    const invalidContentIds =
      // prettier-ignore
      await postDatabase.getInvalidContentIds(creatorSubscription, contentIds);

    return options.filter(
      ({ contentId }) => !invalidContentIds.includes(contentId),
    );
  } catch (error) {
    const childLogger = logger.child({ creatorSubscription });
    childLogger.error(error, "GET_OPTIONS_ERROR");
    return [];
  }
};

const sendMessage = async (
  creatorSubscription: CreatorSubscription,
  option: Option,
) => {
  const {
    creatorChannelId,
    creatorChannelParentId,
    creatorDomainId,
    creatorMentionRoleId,
    creatorType,
    webhookId,
    webhookToken,
  } = creatorSubscription;
  const { avatarURL, components, contentId, url, username } = option;

  let message: APIMessage | undefined;
  const bindings = () => ({ creatorSubscription, message, option });

  const content =
    // prettier-ignore
    creatorMentionRoleId === null ? url : `${roleMention(creatorMentionRoleId)}\n${url}`;
  const threadId =
    creatorChannelParentId === null ? undefined : creatorChannelId;

  const webhook = new WebhookClient({
    id: webhookId,
    token: webhookToken,
  });

  try {
    const channel = await getChannel(creatorSubscription);
    const { type: channelType } = channel;

    let { title } = option;
    title = `${username} - ${title}`.slice(0, 100);

    const threadName =
      channelType === ChannelType.GuildForum ? title : undefined;

    message = await webhook.send({
      avatarURL,
      components,
      content,
      threadId,
      threadName,
      username,
    });

    const { id: messageId } = message;
    switch (channelType) {
      case ChannelType.GuildAnnouncement: {
        const { messages } = channel;
        await messages.crosspost(messageId);
      }
      // falls through
      case ChannelType.GuildText: {
        const { threads } = channel;
        await threads.create({
          name: title,
          startMessage: messageId,
        });
      }
    }
  } catch (error) {
    const childLogger = logger.child(bindings());
    childLogger.warn(error, "SEND_MESSAGE_ERROR");

    if (error instanceof DiscordAPIError && error.status === 404) return true;
    else if (message === undefined) return false;
  }

  const childLogger = logger.child(bindings());
  childLogger.info(message, "SEND_MESSAGE_SUCCESS");

  return {
    contentId,
    creatorChannelId,
    creatorDomainId,
    creatorType,
    id: message.id,
  };
};

const sendMessages = async (creatorSubscription: CreatorSubscription) => {
  const options = await getOptions(creatorSubscription);
  const creatorPosts = [];

  // Messages must be sent in order to guarantee lastContentId functionality.
  // This makes the loop sequentially dependent which means optimizations such
  // as parallelization (mapping each index to a Promise) are not possible.
  for (const option of options) {
    const creatorPost = await sendMessage(creatorSubscription, option);
    if (creatorPost === true) return;
    if (creatorPost === false) break;
    creatorPosts.push(creatorPost);
  }

  return creatorPosts;
};

const postAll = async (creatorSubscriptions: CreatorSubscription[]) => {
  let obsoleteCreatorChannelIds: string[] = [];
  const allCreatorPostsPromises = creatorSubscriptions.map(
    async (creatorSubscription) => {
      const creatorPosts = await sendMessages(creatorSubscription);
      if (creatorPosts === undefined)
        // Only executed if the webhook no longer exists
        obsoleteCreatorChannelIds.push(creatorSubscription.creatorChannelId);
      return creatorPosts ?? [];
    },
  );

  const allCreatorPosts = await Promise.all(allCreatorPostsPromises);
  const creatorPosts = allCreatorPosts.flat();

  if (creatorPosts.length > 0) {
    const childLogger = logger.child({ creatorPosts });

    try {
      await postDatabase.createCreatorPosts(creatorPosts);
      childLogger.info("CREATE_CREATOR_POSTS_SUCCESS");
    } catch (error) {
      childLogger.error(error, "CREATE_CREATOR_POSTS_ERROR");
    }
  }

  if (obsoleteCreatorChannelIds.length > 0) {
    obsoleteCreatorChannelIds = obsoleteCreatorChannelIds.filter(isUnique);
    const childLogger = logger.child({ obsoleteCreatorChannelIds });

    try {
      await creatorsDatabase.deleteCreatorChannels(obsoleteCreatorChannelIds);
      childLogger.info("DELETE_CREATOR_CHANNELS_SUCCESS");
    } catch (error) {
      childLogger.error(error, "DELETE_CREATOR_CHANNELS_ERROR");
    }
  }
};

discord.once(Events.ClientReady, ({ guilds: guildManager }) => {
  // At second 0 at minute 0 past every hour
  const job = new CronJob("0 0 */1 * * *", () => {
    const guilds = guildManager.valueOf();
    const guildIds = [...guilds.keys()];

    postDatabase
      .getCreatorSubscriptions(guildIds)
      .then(postAll)
      .catch((error) => {
        const childLogger = logger.child({ guildIds });
        childLogger.error(error, "GET_CREATOR_SUBSCRIPTIONS_ERROR");
      });
  });

  job.start();
});
