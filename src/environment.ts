const getProcessEnv = (key: string, defaultValue?: string) => {
  const value = process.env[key];
  if (value !== undefined) return value;
  if (defaultValue !== undefined) return defaultValue;
  throw new Error(key);
};

export default {
  DISCORD_TOKEN: getProcessEnv("DISCORD_TOKEN"),
  POSTGRESQL_HOST: getProcessEnv("POSTGRESQL_HOST", "localhost"),
  POSTGRESQL_PORT: getProcessEnv("POSTGRESQL_PORT", "5432"),
  POSTGRESQL_DATABASE: getProcessEnv("POSTGRESQL_DATABASE", "db"),
  POSTGRESQL_USER: getProcessEnv("POSTGRESQL_USER", "user"),
  POSTGRESQL_PASSWORD: getProcessEnv("POSTGRESQL_PASSWORD", "password"),
  PROJECT_NAME: getProcessEnv("PROJECT_NAME", "Pedestrian"),
  REDIS_HOST: getProcessEnv("REDIS_HOST", "localhost"),
  REDIS_PORT: getProcessEnv("REDIS_PORT", "6379"),
  REDIS_CLUSTER: process.env["REDIS_CLUSTER"],
  REDIS_USERNAME: process.env["REDIS_USERNAME"],
  REDIS_PASSWORD: process.env["REDIS_PASSWORD"],
  YOUTUBE_API_KEY: getProcessEnv("YOUTUBE_API_KEY"),
} as const;
