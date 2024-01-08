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
import assert from "node:assert";
import { Gauge, Histogram } from "prom-client";

import * as observability from "./observability";

// region Logger and Metrics
const logger = observability.logger(module);

const interactionRequestDuration = new Histogram({
  help: "Interaction request duration in seconds",
  labelNames: ["handler", "status"],
  name: "interaction_request_duration_seconds",
});

const shardPing = new Gauge({
  help: "Shard ping in seconds",
  labelNames: ["shard"],
  name: "shard_ping_seconds",
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

const { ws } = discord;
const { shards } = ws;

discord.on(Events.Debug, (debug) => {
  logger.debug(debug, "DISCORD_DEBUG");

  for (const [shard, { ping }] of shards) {
    const labels = { shard };
    shardPing.set(labels, ping / 1000);
  }
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

export const toChoices = (o: Record<string, string>) =>
  Object.entries(o).map(([name, value]) => ({ name, value }));
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
  } else if (uiid === undefined) {
    assert.fail();
  } else {
    return uiid;
  }
};

const createContext = (status: "error" | "success", uiid?: string) => {
  return (result: unknown) => ({ result, status, uiid });
};

const onCommand = (interaction: CommandInteraction) => {
  for (const [name, { onCommand }] of commands) {
    if (name === interaction.commandName) {
      return onCommand(interaction)
        .then(createContext("success"))
        .catch(createContext("error"));
    }
  }
};

const onAutocomplete = (interaction: AutocompleteInteraction) => {
  for (const [name, { onAutocomplete }] of commands) {
    if (name === interaction.commandName) {
      assert(onAutocomplete !== undefined);
      return onAutocomplete(interaction)
        .then(createContext("success"))
        .catch(createContext("error"));
    }
  }
};

const onMessageComponent = (interaction: MessageComponentInteraction) => {
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
        .then(createContext("success", uiid))
        .catch(createContext("error", uiid));
    }
  }
};

const onModalSubmit = (interaction: ModalSubmitInteraction) => {
  const { customId } = interaction;
  for (const [uiid, onModal] of modals) {
    if (customId.startsWith(uiid)) {
      const id = customId.slice(uiid.length);
      return onModal(interaction, id)
        .then(createContext("success", uiid))
        .catch(createContext("error", uiid));
    }
  }
};

discord.on(Events.InteractionCreate, async (interaction) => {
  const observeRequestDuration = interactionRequestDuration.startTimer();

  let context;
  if (interaction.isCommand()) {
    context = await onCommand(interaction);
  } else if (interaction.isAutocomplete()) {
    context = await onAutocomplete(interaction);
  } else if (interaction.isMessageComponent()) {
    context = await onMessageComponent(interaction);
  } else if (interaction.isModalSubmit()) {
    context = await onModalSubmit(interaction);
  }

  assert(context !== undefined);
  const { result, status, uiid } = context;

  const handler = getHandler(interaction, uiid);
  const labels = { handler, status };
  const requestDuration = observeRequestDuration(labels);

  const childLogger = logger.child({
    interaction,
    labels,
    requestDuration,
  });

  if (status === "error") {
    childLogger.error(result, "ON_INTERACTION_ERROR");
  } else if (requestDuration >= 2.5) {
    childLogger.warn(result, "ON_INTERACTION_SUCCESS_SLOW");
  } else {
    childLogger.info(result, "ON_INTERACTION_SUCCESS");
  }
});
// endregion
// endregion
