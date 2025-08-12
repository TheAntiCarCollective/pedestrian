import type { LevelWithSilent } from "pino";

import assert from "node:assert/strict";

const { env } = process;

const required = (name: string) => {
  const value = env[name];
  // region assert
  assert(value !== undefined, `Environment variable ${name} is required`);
  // endregion
  return value;
};

export default {
  DiscordToken: required("DISCORD_TOKEN"),
  EnableCarsized: env.ENABLE_CARSIZED === true.toString(),
  ExpressPort: Number(env.EXPRESS_PORT ?? 8080),
  PinoLevel: (env.PINO_LEVEL ?? "info") as LevelWithSilent,
  PostgresqlDatabase: env.POSTGRESQL_DATABASE ?? "db",
  PostgresqlHost: env.POSTGRESQL_HOST ?? "postgres",
  PostgresqlPassword: env.POSTGRESQL_PASSWORD ?? "password",
  PostgresqlPort: Number(env.POSTGRESQL_PORT ?? 5432),
  PostgresqlSsl: env.POSTGRESQL_SSL === true.toString(),
  PostgresqlSslCa: env.POSTGRESQL_SSL_CA ?? "./ca.crt",
  PostgresqlUser: env.POSTGRESQL_USER ?? "user",
  ProjectName: env.PROJECT_NAME ?? "Pedestrian",
  RedisCluster: env.REDIS_CLUSTER === true.toString(),
  RedisDb: Number(env.REDIS_DB ?? 0),
  RedisHost: env.REDIS_HOST ?? "redis",
  RedisPassword: env.REDIS_PASSWORD,
  RedisPort: Number(env.REDIS_PORT ?? 6379),
  RedisUsername: env.REDIS_USERNAME,
  YoutubeApiKey: required("YOUTUBE_API_KEY"),
} as const;
