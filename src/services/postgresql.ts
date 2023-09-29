import type { PoolClient } from "pg";

import { Pool } from "pg";
import loggerFactory from "pino";
import { Histogram, exponentialBuckets } from "prom-client";

import Environment from "../environment";

// region Types
type Callback<T> = (client: PoolClient) => Promise<T>;
// endregion

// region Logger and Metrics
const logger = loggerFactory({
  name: __filename,
});

const databaseRequestDuration = new Histogram({
  // Create 11 buckets, starting on 1 and with a factor of 2
  buckets: exponentialBuckets(1, 2, 11),
  help: "Database request duration in milliseconds",
  labelNames: ["caller", "status", "connected"],
  name: "database_request_duration_milliseconds",
});
// endregion

const postgresql = new Pool({
  database: Environment.PostgresqlDatabase,
  host: Environment.PostgresqlHost,
  password: Environment.PostgresqlPassword,
  port: Number.parseInt(Environment.PostgresqlPort),
  user: Environment.PostgresqlUser,
});

export const useClient = async <T>(caller: string, callback: Callback<T>) => {
  const startRequestTime = performance.now();
  const onDatabase =
    (status: "error" | "success", client?: PoolClient) => (result: unknown) => {
      client?.release(status === "error");

      const endRequestTime = performance.now();
      const requestDuration = endRequestTime - startRequestTime;

      const connected = (client !== undefined).toString();
      const labels = { caller, connected, status };
      databaseRequestDuration.observe(labels, requestDuration);

      const childLogger = logger.child({
        labels,
        requestDuration,
      });

      switch (status) {
        case "success": {
          childLogger.debug(result, "ON_DATABASE_SUCCESS");
          return result as T;
        }
        case "error": {
          throw result;
        }
      }
    };

  return postgresql
    .connect()
    .then((client) =>
      callback(client)
        .then(onDatabase("success", client))
        .catch(onDatabase("error", client)),
    )
    .catch(onDatabase("error"));
};

export const useTransaction = <T>(caller: string, callback: Callback<T>) =>
  useClient(caller, async (client) => {
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
