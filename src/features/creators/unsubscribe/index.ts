import { youtube_v3 } from "@googleapis/youtube";
import YoutubeChannel = youtube_v3.Schema$Channel;

import type { ChatInputCommandInteraction } from "discord.js";
import assert from "node:assert";

import * as session from "../../../session";

import type { Context, Creators, CreatorSubscription } from "./types";
import * as database from "./database";
import * as ui from "./ui";
import * as youtube from "../youtube";
import { CreatorType } from "../constants";
import { getChannels } from "../function";

// Install
import "./components/index.select";
import "./components/apply.button";
import "./components/cancel.button";

const getCreators = async (creatorSubscriptions: CreatorSubscription[]) => {
  const creatorDomains = {
    [CreatorType.YouTube]: new Set<string>(),
  };

  for (const { creatorDomainId, creatorType } of creatorSubscriptions) {
    const creatorDomainIds = creatorDomains[creatorType];
    creatorDomainIds.add(creatorDomainId);
  }

  const creatorPromises = Object.entries(creatorDomains).map(
    async ([creatorType, creatorDomainIds]) => {
      switch (creatorType) {
        case CreatorType.YouTube: {
          const youtubeChannelPromises: Promise<YoutubeChannel>[] = [];
          for (const creatorDomainId of creatorDomainIds) {
            const youtubeChannelPromise = youtube.getChannel(creatorDomainId);
            youtubeChannelPromises.push(youtubeChannelPromise);
          }

          const youtubeChannels = await Promise.all(youtubeChannelPromises);
          const youtubeCreators: Record<string, YoutubeChannel> = {};

          for (const youtubeChannel of youtubeChannels) {
            const { id } = youtubeChannel;
            assert(typeof id === "string");
            youtubeCreators[id] = youtubeChannel;
          }

          return { [creatorType]: youtubeCreators };
        }
      }
    },
  );

  const creators = await Promise.all(creatorPromises);
  return Object.assign({}, ...creators) as Creators;
};

export default async (interaction: ChatInputCommandInteraction) => {
  const { guild } = interaction;
  assert(guild !== null);
  const { channels: guildChannelManager, id: guildId } = guild;

  let creatorSubscriptions = await database.getCreatorSubscriptions(guildId);
  const channels = await getChannels(creatorSubscriptions, guildChannelManager);

  // prettier-ignore
  creatorSubscriptions = creatorSubscriptions
    .filter(({ creatorChannelId }) => channels.has(creatorChannelId));

  if (creatorSubscriptions.length === 0) {
    return interaction.reply(ui.noCreatorSubscriptions());
  }

  const creators = await getCreators(creatorSubscriptions);
  const partialContext = {
    creatorSubscriptions,
    creators,
    selectedIndexes: [],
  };

  const context = await session.create<Context>(partialContext, interaction);
  return interaction.reply(ui.unsubscribeMenu(context, channels));
};
