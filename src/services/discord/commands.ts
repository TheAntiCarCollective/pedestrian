import type {
  ApplicationCommandType,
  ChatInputCommandInteraction,
  Client,
  CommandInteraction,
  ContextMenuCommandBuilder,
  InteractionReplyOptions,
  MessageContextMenuCommandInteraction,
  SlashCommandBuilder,
  UserContextMenuCommandInteraction,
} from "discord.js";
import { EmbedBuilder, Events, Routes } from "discord.js";

import discord, { Color, JsonError } from "./index";

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
    .reduce(({ get, set }, command) => {
      const guildId = command.guildId!;
      const body = get(guildId) ?? [];
      body.push(command.json);
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
          await onInteraction(interaction);
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

// #region message
export enum MessageMode {
  REPLY,
  EDIT_REPLY,
  FOLLOW_UP,
}

export const message = (
  interaction: CommandInteraction,
  mode: MessageMode,
  color: Color,
  description: string,
  callback?: (
    options: InteractionReplyOptions,
    embed: EmbedBuilder,
  ) => InteractionReplyOptions,
) => {
  // prettier-ignore
  const embed = new EmbedBuilder()
    .setColor(color)
    .setDescription(description);

  const defaultOptions = {
    embeds: [embed],
    ephemeral: true,
  };

  const options = callback ? callback(defaultOptions, embed) : defaultOptions;

  switch (mode) {
    case MessageMode.REPLY:
      return interaction.reply(options);
    case MessageMode.EDIT_REPLY:
      return interaction.editReply(options);
    case MessageMode.FOLLOW_UP:
      return interaction.followUp(options);
    default:
      throw new JsonError(interaction);
  }
};
// #endregion
