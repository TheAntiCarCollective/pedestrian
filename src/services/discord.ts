import type {
  AutocompleteInteraction,
  CommandInteraction,
  ContextMenuCommandBuilder,
  InteractionResponse,
  Message,
  MessageComponentInteraction,
  ModalSubmitInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { Events, Client, User, Routes } from "discord.js";
import loggerFactory from "pino";
import { Histogram, exponentialBuckets } from "prom-client";
import assert, { fail as error } from "node:assert";

// region Logger and Metrics
const logger = loggerFactory({
  name: __filename,
});

const interactionRequestDuration = new Histogram({
  name: "interaction_request_duration_milliseconds",
  help: "Interaction request duration in milliseconds",
  labelNames: ["status", "handler"],
  // Create 9 buckets, starting on 10 and with a factor of 2
  buckets: exponentialBuckets(10, 2, 9),
});
// endregion

// region Constants
export enum Color {
  Error = 0xed4245, // Red
  Warning = 0xfee75c, // Yellow
  Informational = 0x5865f2, // Blurple
  Success = 0x57f287, // Green
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
  if (member === undefined) return false;
  return true; // TODO Check role type
};
// endregion

// region Interactions
// region Types
type ContextMenuCommandJson = ReturnType<ContextMenuCommandBuilder["toJSON"]>;
type SlashCommandJson = ReturnType<SlashCommandBuilder["toJSON"]>;
type CommandJson = ContextMenuCommandJson | SlashCommandJson;

type OnInteractionResult = Promise<InteractionResponse | Message | undefined>;
type OnCommand = (interaction: CommandInteraction) => OnInteractionResult;
type OnAutocomplete = (interaction: AutocompleteInteraction) => Promise<void>;
// prettier-ignore
type OnComponent = (interaction: MessageComponentInteraction, id: string) => OnInteractionResult;
// prettier-ignore
type OnModal = (interaction: ModalSubmitInteraction, id: string) => OnInteractionResult;

type Command = {
  json: CommandJson;
  guildId?: string;
  onCommand: OnCommand;
  onAutocomplete?: OnAutocomplete;
};
// endregion

const commands = new Map<string, Command>();
export const registerCommand = (
  json: CommandJson,
  guildId: string | undefined,
  onCommand: OnCommand,
  onAutocomplete?: OnAutocomplete,
) =>
  void commands.set(json.name, {
    json,
    guildId,
    onCommand,
    onAutocomplete,
  });

const components = new Map<string, OnComponent>();
export const registerComponent = (
  componentId: string,
  onComponent: OnComponent,
) => void components.set(componentId, onComponent);

const modals = new Map<string, OnModal>();
export const registerModal = (modalId: string, onModal: OnModal) =>
  void modals.set(modalId, onModal);

export const refreshCommands = async () => {
  if (commands.size === 0) return;
  const allCommands = [...commands.values()];

  const globalCommands = allCommands
    .filter(({ guildId }) => guildId === undefined)
    .map(({ json }) => json);

  const guildCommands = allCommands
    .filter(({ guildId }) => guildId !== undefined)
    .reduce((map, { guildId, json }) => {
      assert(guildId !== undefined);
      const body = map.get(guildId) ?? [];
      body.push(json);
      return map.set(guildId, body);
    }, new Map<string, CommandJson[]>());

  const { application, rest } = discord;
  assert(application !== null);
  const { id: applicationId } = application;

  const promises: Promise<unknown>[] = [];
  for (const [guildId, body] of guildCommands) {
    const applicationGuildCommandsRequest = rest.put(
      Routes.applicationGuildCommands(applicationId, guildId),
      { body },
    );

    promises.push(applicationGuildCommandsRequest);
  }

  const applicationCommandsRequest = rest.put(
    Routes.applicationCommands(applicationId),
    { body: globalCommands },
  );

  promises.push(applicationCommandsRequest);
  await Promise.all(promises);
};

discord.once(Events.ClientReady, refreshCommands);

discord.on(Events.InteractionCreate, async (interaction) => {
  const startRequestTime = performance.now();
  const onInteraction =
    (status: "success" | "error", handler: string) => (result: unknown) => {
      const endRequestTime = performance.now();
      const requestDuration = endRequestTime - startRequestTime;

      const labels = { status, handler };
      interactionRequestDuration.observe(labels, requestDuration);

      const childLogger = logger.child({
        labels,
        interaction,
        requestDuration,
      });

      switch (status) {
        case "success":
          childLogger.info(result, "ON_INTERACTION_SUCCESS");
          break;
        case "error":
          childLogger.error(result, "ON_INTERACTION_ERROR");
          break;
      }
    };

  if (interaction.isCommand()) {
    for (const [name, { onCommand }] of commands) {
      if (name === interaction.commandName) {
        let handler: string;

        if (interaction.isChatInputCommand()) {
          const { options } = interaction;
          const subcommandGroup = options.getSubcommandGroup(false);
          const subcommand = options.getSubcommand(false);

          handler = `/${name}`;
          handler += subcommandGroup === null ? "" : ` ${subcommandGroup}`;
          handler += subcommand === null ? "" : ` ${subcommand}`;
        } else {
          handler = name;
        }

        return onCommand(interaction)
          .then(onInteraction("success", handler))
          .catch(onInteraction("error", handler));
      }
    }
  } else if (interaction.isAutocomplete()) {
    const { commandName, options } = interaction;
    for (const [name, { onAutocomplete }] of commands) {
      if (name === commandName) {
        assert(onAutocomplete !== undefined);

        const { name: option } = options.getFocused(true);
        const handler = `${name}#${option}`;

        return onAutocomplete(interaction)
          .then(onInteraction("success", handler))
          .catch(onInteraction("error", handler));
      }
    }
  } else if (interaction.isMessageComponent()) {
    let { customId } = interaction;
    for (const [componentId, onComponent] of components) {
      const legacyPrefix = `GLOBAL_${componentId}_`;
      if (customId.startsWith(legacyPrefix)) {
        const id = customId.slice(legacyPrefix.length);
        customId = `${componentId}${id}`;
      }

      if (customId.startsWith(componentId)) {
        const id = customId.slice(componentId.length);
        return onComponent(interaction, id)
          .then(onInteraction("success", componentId))
          .catch(onInteraction("error", componentId));
      }
    }
  } else if (interaction.isModalSubmit()) {
    const { customId } = interaction;
    for (const [modalId, onModal] of modals) {
      if (customId.startsWith(modalId)) {
        const id = customId.slice(modalId.length);
        return onModal(interaction, id)
          .then(onInteraction("success", modalId))
          .catch(onInteraction("error", modalId));
      }
    }
  }

  error();
});
// endregion
