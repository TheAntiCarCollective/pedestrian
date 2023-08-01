import type {
  ApplicationCommandType,
  ChatInputCommandInteraction,
  Client,
  ContextMenuCommandBuilder,
  MessageContextMenuCommandInteraction,
  SlashCommandBuilder,
  UserContextMenuCommandInteraction,
} from "discord.js";
import { Events, Routes } from "discord.js";

import discord from "./index";

// region Types
type ContextMenuCommandJson = ReturnType<ContextMenuCommandBuilder["toJSON"]>;
type SlashCommandJson = ReturnType<SlashCommandBuilder["toJSON"]>;
type CommandJson<T extends ApplicationCommandType = ApplicationCommandType> =
  T extends ApplicationCommandType.ChatInput
    ? SlashCommandJson
    : ContextMenuCommandJson;

type Interaction<T extends ApplicationCommandType> =
  T extends ApplicationCommandType.ChatInput
    ? ChatInputCommandInteraction
    : // prettier-ignore
    T extends ApplicationCommandType.User
      ? UserContextMenuCommandInteraction
      : MessageContextMenuCommandInteraction;

type InteractionCallback<T extends ApplicationCommandType> = (
  interaction: Interaction<T>,
) => Promise<void> | void;

type Command<T extends ApplicationCommandType = ApplicationCommandType> = {
  guildId?: string;
  json: CommandJson<T>;
  onInteraction: InteractionCallback<T>;
};

export type ChatInputCommand = Command<ApplicationCommandType.ChatInput>;
export type UserCommand = Command<ApplicationCommandType.User>;
export type MessageCommand = Command<ApplicationCommandType.Message>;
// endregion

// region createCommands
const createCommands = async (client: Client<true>, commands: Command[]) => {
  if (commands.length === 0) return;

  const globalCommands = commands
    .filter(({ guildId }) => guildId === undefined)
    .map(({ json }) => json);

  const guildCommands = commands
    .filter(({ guildId }) => guildId !== undefined)
    .reduce(({ get, set }, { guildId, json }) => {
      if (guildId === undefined) throw new Error();
      const body = get(guildId) ?? [];
      body.push(json);
      return set(guildId, body);
    }, new Map<string, CommandJson[]>());

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
          let result = onInteraction(interaction);
          result = result instanceof Promise ? result : Promise.resolve();
          await result.catch(console.error);
          break;
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
