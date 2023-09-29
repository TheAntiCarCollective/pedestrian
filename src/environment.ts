import { fail as error } from "node:assert";

const { env: environmentVariables } = process;
const environmentVariable = (key: string, defaultValue?: string) => {
  const value = environmentVariables[key];
  if (value !== undefined) return value;
  if (defaultValue !== undefined) return defaultValue;
  error();
};

export default {
  BotGuildId: environmentVariables.BOT_GUILD_ID,
  DiscordToken: environmentVariable("DISCORD_TOKEN"),
  PostgresqlDatabase: environmentVariable("POSTGRESQL_DATABASE", "db"),
  PostgresqlHost: environmentVariable("POSTGRESQL_HOST", "localhost"),
  PostgresqlPassword: environmentVariable("POSTGRESQL_PASSWORD", "password"),
  PostgresqlPort: environmentVariable("POSTGRESQL_PORT", "5432"),
  PostgresqlUser: environmentVariable("POSTGRESQL_USER", "user"),
  ProjectName: environmentVariable("PROJECT_NAME", "Pedestrian"),
  RedisCluster: environmentVariables.REDIS_CLUSTER,
  RedisHost: environmentVariable("REDIS_HOST", "localhost"),
  RedisPassword: environmentVariables.REDIS_PASSWORD,
  RedisPort: environmentVariable("REDIS_PORT", "6379"),
  RedisUsername: environmentVariables.REDIS_USERNAME,
  ServerPort: environmentVariable("SERVER_PORT", "8080"),
  YoutubeApiKey: environmentVariable("YOUTUBE_API_KEY"),
} as const;
