import type {
  Client,
  ContextMenuCommandBuilder,
  Interaction,
  InteractionResponse,
  SlashCommandBuilder,
} from "discord.js";
import { Events, Routes, User } from "discord.js";
import loggerFactory from "pino";

import discord from "./index";

// region Types
type ContextMenuCommandJson = ReturnType<ContextMenuCommandBuilder["toJSON"]>;
type SlashCommandJson = ReturnType<SlashCommandBuilder["toJSON"]>;
type CommandJson = ContextMenuCommandJson | SlashCommandJson;

export type Command = {
  guildId?: string;
  json: CommandJson;
  onInteraction: (interaction: Interaction) => Promise<InteractionResponse>;
};
// endregion

const logger = loggerFactory({
  name: __filename,
});

// region createCommands
const createCommands = async (client: Client<true>, commands: Command[]) => {
  if (commands.length === 0) return;

  const globalCommands = commands
    .filter(({ guildId }) => guildId === undefined)
    .map(({ json }) => json);

  const guildCommands = new Map<string, CommandJson[]>();
  for (const { guildId, json } of commands) {
    if (guildId !== undefined) {
      const body = guildCommands.get(guildId) ?? [];
      body.push(json);
      guildCommands.set(guildId, body);
    }
  }

  const promises: Promise<unknown>[] = [];
  const { application, rest } = client;
  const { id } = application;

  promises.push(
    rest.put(Routes.applicationCommands(id), { body: globalCommands }),
  );

  for (const [guildId, body] of guildCommands) {
    promises.push(
      rest.put(Routes.applicationGuildCommands(id, guildId), { body }),
    );
  }

  await Promise.all(promises);

  client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isCommand()) {
      for (const { json, onInteraction } of commands) {
        if (json.name === interaction.commandName) {
          try {
            await onInteraction(interaction);
          } catch (error) {
            logger.error(error, "ON_INTERACTION_ERROR");
          }
        }
      }
    }
  });
};
// endregion

// region registerCommands
let bufferedCommands: Command[] = [];

export const registerCommands = async (commands: Command[]) => {
  if (discord.isReady()) {
    await createCommands(discord, commands);
  } else {
    bufferedCommands.push(...commands);
  }
};

export const registerCommand = (command: Command) =>
  registerCommands([command]);

// Bulk create commands registered before discord was ready.
discord.once(Events.ClientReady, async (client) => {
  await createCommands(client, bufferedCommands);
  bufferedCommands = [];
});
// endregion

export const isUserOwner = async ({ client, user }: Interaction) => {
  const { application } = client;
  const { owner } = application.partial
    ? await application.fetch()
    : application;

  if (owner === null) return false;

  const { id: userId } = user;
  if (owner instanceof User) return owner.id === userId;

  const { members } = owner;
  return members.has(userId);
};
