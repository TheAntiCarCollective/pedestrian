import type { PoolClient } from "pg";
import { Pool } from "pg";
import loggerFactory from "pino";

import Environment from "../environment";

// region Types
type Callback<T> = (client: PoolClient) => Promise<T>;
// endregion

const logger = loggerFactory({
  name: __filename,
});

const postgresql = new Pool({
  host: Environment.PostgresqlHost,
  port: parseInt(Environment.PostgresqlPort),
  database: Environment.PostgresqlDatabase,
  user: Environment.PostgresqlUser,
  password: Environment.PostgresqlPassword,
});

export const useClient = async <T>(callback: Callback<T>) => {
  const client = await postgresql.connect();

  try {
    return await callback(client);
  } finally {
    client.release();
  }
};

export const useTransaction = <T>(callback: Callback<T>) =>
  useClient(async (client) => {
    await client.query("begin");

    try {
      const result = await callback(client);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });

postgresql.on("error", (error) => {
  logger.error(error, "POSTGRESQL_ERROR");
});

export default postgresql;
