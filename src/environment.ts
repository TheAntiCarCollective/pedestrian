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
  PostgresqlHost: environmentVariable("POSTGRESQL_HOST", "localhost"),
  PostgresqlPort: environmentVariable("POSTGRESQL_PORT", "5432"),
  PostgresqlDatabase: environmentVariable("POSTGRESQL_DATABASE", "db"),
  PostgresqlUser: environmentVariable("POSTGRESQL_USER", "user"),
  PostgresqlPassword: environmentVariable("POSTGRESQL_PASSWORD", "password"),
  ProjectName: environmentVariable("PROJECT_NAME", "Pedestrian"),
  RedisHost: environmentVariable("REDIS_HOST", "localhost"),
  RedisPort: environmentVariable("REDIS_PORT", "6379"),
  RedisCluster: environmentVariables.REDIS_CLUSTER,
  RedisUsername: environmentVariables.REDIS_USERNAME,
  RedisPassword: environmentVariables.REDIS_PASSWORD,
  ServerPort: environmentVariable("SERVER_PORT", "8080"),
  YoutubeApiKey: environmentVariable("YOUTUBE_API_KEY"),
} as const;
