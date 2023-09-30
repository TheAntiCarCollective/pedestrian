import type {
  AutocompleteInteraction,
  BaseInteraction,
  CommandInteraction,
  ContextMenuCommandBuilder,
  InteractionResponse,
  Message,
  MessageComponentInteraction,
  ModalSubmitInteraction,
  SlashCommandBuilder,
} from "discord.js";

import { Client, Events, Routes, User } from "discord.js";
import assert, { fail as error } from "node:assert";
import loggerFactory from "pino";
import { Histogram, exponentialBuckets } from "prom-client";

// region Logger and Metrics
const logger = loggerFactory({
  name: __filename,
});

const interactionRequestDuration = new Histogram({
  // Create 9 buckets, starting on 10 and with a factor of 2
  buckets: exponentialBuckets(10, 2, 9),
  help: "Interaction request duration in milliseconds",
  labelNames: ["status", "handler"],
  name: "interaction_request_duration_milliseconds",
});
// endregion

// region Constants
export enum Color {
  Error = 0xed_42_45, // Red
  Informational = 0x58_65_f2, // Blurple
  Success = 0x57_f2_87, // Green
  Warning = 0xfe_e7_5c, // Yellow
}
// endregion

// region Client
const discord = new Client({
  intents: ["Guilds"],
});

discord.on(Events.Debug, (debug) => {
  logger.debug(debug, "DISCORD_DEBUG");
});

discord.on(Events.Warn, (warn) => {
  logger.warn(warn, "DISCORD_WARN");
});

discord.on(Events.Error, (error) => {
  logger.error(error, "DISCORD_ERROR");
});

// Initialize ClientApplication for future uses
discord.on(Events.ClientReady, async ({ application }) => {
  if (application.partial) await application.fetch();
});

export default discord;
// endregion

// region Functions
export const isUserOwner = (userId: string) => {
  const { application } = discord;
  assert(application !== null);
  const { owner } = application;
  assert(owner !== null);

  if (owner instanceof User) return owner.id === userId;

  const { members } = owner;
  const member = members.get(userId);
  // TODO Check role type
  return member !== undefined;
};
// endregion

// region Interactions
// region Types
type ContextMenuCommandJson = ReturnType<ContextMenuCommandBuilder["toJSON"]>;
type SlashCommandJson = ReturnType<SlashCommandBuilder["toJSON"]>;
type CommandJson = ContextMenuCommandJson | SlashCommandJson;

// FIXME: Handlers that show modals typically have void return types
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
type OnInteractionResult = Promise<InteractionResponse | Message | void>;
type OnCommand = (interaction: CommandInteraction) => OnInteractionResult;
type OnAutocomplete = (interaction: AutocompleteInteraction) => Promise<void>;
// prettier-ignore
type OnComponent = (interaction: MessageComponentInteraction, id: string) => OnInteractionResult;
// prettier-ignore
type OnModal = (interaction: ModalSubmitInteraction, id: string) => OnInteractionResult;

type Command = {
  json: CommandJson;
  onAutocomplete?: OnAutocomplete;
  onCommand: OnCommand;
};
// endregion

// region Registered Handlers
const commands = new Map<string, Command>();
export const registerCommand = (
  json: CommandJson,
  onCommand: OnCommand,
  onAutocomplete?: OnAutocomplete,
) =>
  void commands.set(json.name, {
    json,
    onAutocomplete,
    onCommand,
  });

const components = new Map<string, OnComponent>();
export const registerComponent = (uiid: string, onComponent: OnComponent) =>
  void components.set(uiid, onComponent);

const modals = new Map<string, OnModal>();
export const registerModal = (uiid: string, onModal: OnModal) =>
  void modals.set(uiid, onModal);
// endregion

// region refreshCommands
export const refreshCommands = async () => {
  if (commands.size === 0) return;

  const { application, rest } = discord;
  assert(application !== null);
  const { id: applicationId } = application;

  const allCommands = [...commands.values()];
  const body = allCommands.map(({ json }) => json);
  await rest.put(Routes.applicationCommands(applicationId), { body });
};

discord.once(Events.ClientReady, refreshCommands);
// endregion

// region Handlers
const getHandler = (interaction: BaseInteraction, uiid?: string) => {
  if (interaction.isCommand()) {
    let { commandName } = interaction;

    if (interaction.isChatInputCommand()) {
      const { options } = interaction;
      const subcommandGroup = options.getSubcommandGroup(false);
      const subcommand = options.getSubcommand(false);

      commandName = `/${commandName}`;
      commandName += subcommandGroup === null ? "" : ` ${subcommandGroup}`;
      commandName += subcommand === null ? "" : ` ${subcommand}`;
    }

    return commandName;
  } else if (interaction.isAutocomplete()) {
    const { commandName, options } = interaction;
    const { name: option } = options.getFocused(true);
    return `${commandName}#${option}`;
  } else if (uiid !== undefined) {
    return uiid;
  }

  error();
};

const onInteraction =
  (
    status: "error" | "success",
    interaction: BaseInteraction,
    startRequestTime: number,
    uiid?: string,
  ) =>
  (result: unknown) => {
    const endRequestTime = performance.now();
    const requestDuration = endRequestTime - startRequestTime;

    const handler = getHandler(interaction, uiid);
    const labels = { handler, status };
    interactionRequestDuration.observe(labels, requestDuration);

    const childLogger = logger.child({
      interaction,
      labels,
      requestDuration,
    });

    switch (status) {
      case "success": {
        childLogger.info(result, "ON_INTERACTION_SUCCESS");
        break;
      }
      case "error": {
        childLogger.error(result, "ON_INTERACTION_ERROR");
        break;
      }
    }
  };

const onCommand = (
  interaction: CommandInteraction,
  startRequestTime: number,
) => {
  for (const [name, { onCommand }] of commands) {
    if (name === interaction.commandName) {
      return onCommand(interaction)
        .then(onInteraction("success", interaction, startRequestTime))
        .catch(onInteraction("error", interaction, startRequestTime));
    }
  }
};

const onAutocomplete = (
  interaction: AutocompleteInteraction,
  startRequestTime: number,
) => {
  for (const [name, { onAutocomplete }] of commands) {
    if (name === interaction.commandName) {
      assert(onAutocomplete !== undefined);
      return onAutocomplete(interaction)
        .then(onInteraction("success", interaction, startRequestTime))
        .catch(onInteraction("error", interaction, startRequestTime));
    }
  }
};

const onMessageComponent = (
  interaction: MessageComponentInteraction,
  startRequestTime: number,
) => {
  let { customId } = interaction;
  for (const [uiid, onComponent] of components) {
    const legacyPrefix = `GLOBAL_${uiid}_`;
    if (customId.startsWith(legacyPrefix)) {
      const id = customId.slice(legacyPrefix.length);
      customId = `${uiid}${id}`;
    }

    if (customId.startsWith(uiid)) {
      const id = customId.slice(uiid.length);
      return onComponent(interaction, id)
        .then(onInteraction("success", interaction, startRequestTime, uiid))
        .catch(onInteraction("error", interaction, startRequestTime, uiid));
    }
  }
};

const onModalSubmit = (
  interaction: ModalSubmitInteraction,
  startRequestTime: number,
) => {
  const { customId } = interaction;
  for (const [uiid, onModal] of modals) {
    if (customId.startsWith(uiid)) {
      const id = customId.slice(uiid.length);
      return onModal(interaction, id)
        .then(onInteraction("success", interaction, startRequestTime, uiid))
        .catch(onInteraction("error", interaction, startRequestTime, uiid));
    }
  }
};

discord.on(Events.InteractionCreate, async (interaction) => {
  const startRequestTime = performance.now();

  if (interaction.isCommand()) {
    await onCommand(interaction, startRequestTime);
  } else if (interaction.isAutocomplete()) {
    await onAutocomplete(interaction, startRequestTime);
  } else if (interaction.isMessageComponent()) {
    await onMessageComponent(interaction, startRequestTime);
  } else if (interaction.isModalSubmit()) {
    await onModalSubmit(interaction, startRequestTime);
  } else {
    error();
  }
});
// endregion
// endregion
