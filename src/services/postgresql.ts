import type { PoolClient } from "pg";
import { Pool } from "pg";

import Environment from "../environment";

// region Types
type Callback<T> = (client: PoolClient) => Promise<T>;
// endregion

const postgresql = new Pool({
  host: Environment.POSTGRESQL_HOST,
  port: parseInt(Environment.POSTGRESQL_PORT),
  database: Environment.POSTGRESQL_DATABASE,
  user: Environment.POSTGRESQL_USER,
  password: Environment.POSTGRESQL_PASSWORD,
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

export default postgresql;
