import assert from "node:assert";

const { env } = process;
export default {
  BotGuildId: env.BOT_GUILD_ID,
  DiscordToken: env.DISCORD_TOKEN ?? assert.fail(),
  EnableCarsized: Boolean(env.ENABLE_CARSIZED),
  ExpressPort: Number(env.EXPRESS_PORT ?? 8080),
  PostgresqlDatabase: env.POSTGRESQL_DATABASE ?? "db",
  PostgresqlHost: env.POSTGRESQL_HOST ?? "postgres",
  PostgresqlPassword: env.POSTGRESQL_PASSWORD ?? "password",
  PostgresqlPort: Number(env.POSTGRESQL_PORT ?? 5432),
  PostgresqlUser: env.POSTGRESQL_USER ?? "user",
  ProjectName: env.PROJECT_NAME ?? "Pedestrian",
  RedisCluster: Boolean(env.REDIS_CLUSTER),
  RedisHost: env.REDIS_HOST ?? "redis",
  RedisPassword: env.REDIS_PASSWORD,
  RedisPort: Number(env.REDIS_PORT ?? 6379),
  RedisUsername: env.REDIS_USERNAME,
  YoutubeApiKey: env.YOUTUBE_API_KEY ?? assert.fail(),
} as const;
