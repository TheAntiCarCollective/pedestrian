import type { PoolClient } from "pg";
import { Pool } from "pg";

import { ProcessEnv } from "../constants";

// region Types
type Callback<T> = (client: PoolClient) => Promise<T>;
// endregion

const postgresql = new Pool({
  host: ProcessEnv.POSTGRESQL_HOST,
  port: parseInt(ProcessEnv.POSTGRESQL_PORT),
  database: ProcessEnv.POSTGRESQL_DATABASE,
  user: ProcessEnv.POSTGRESQL_USER,
  password: ProcessEnv.POSTGRESQL_PASSWORD,
});

export const useClient = async <T>(callback: Callback<T>) => {
  const client = await postgresql.connect();

  try {
    return callback(client);
  } finally {
    client.release();
  }
};

export const useTransaction = <T>(callback: Callback<T>) =>
  useClient(async (client) => {
    await client.query("BEGIN");

    try {
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });

export default postgresql;
