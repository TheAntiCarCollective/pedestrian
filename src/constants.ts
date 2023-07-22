const getProcessEnv = (key: string) => {
  const value = process.env[key];
  if (value) return value;
  throw new Error(key);
};

export const ProcessEnv = {
  DISCORD_TOKEN: getProcessEnv("DISCORD_TOKEN"),
  POSTGRESQL_HOST: getProcessEnv("POSTGRESQL_HOST"),
  POSTGRESQL_PORT: getProcessEnv("POSTGRESQL_PORT"),
  POSTGRESQL_DATABASE: getProcessEnv("POSTGRESQL_DATABASE"),
  POSTGRESQL_USER: getProcessEnv("POSTGRESQL_USER"),
  POSTGRESQL_PASSWORD: getProcessEnv("POSTGRESQL_PASSWORD"),
  PROJECT_NAME: getProcessEnv("PROJECT_NAME"),
  REDIS_HOST: getProcessEnv("REDIS_HOST"),
  REDIS_PORT: getProcessEnv("REDIS_PORT"),
  YOUTUBE_API_KEY: getProcessEnv("YOUTUBE_API_KEY"),
} as const;

export enum ExitCode {
  BOOTSTRAP_FAILED = 1,
}
