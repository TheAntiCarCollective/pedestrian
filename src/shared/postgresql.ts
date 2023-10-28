import type { PoolClient } from "pg";

import { Pool } from "pg";
import { Histogram } from "prom-client";

import type { Caller } from "./caller";

import Environment from "./environment";
import loggerFactory from "./logger";

// region Types
type Callback<T> = (client: PoolClient) => Promise<T>;
// endregion

// region Logger and Metrics
const logger = loggerFactory(module);

const databaseRequestDuration = new Histogram({
  help: "Database request duration in seconds",
  labelNames: ["caller", "connected", "status"],
  name: "database_request_duration_seconds",
});
// endregion

const postgresql = new Pool({
  database: Environment.PostgresqlDatabase,
  host: Environment.PostgresqlHost,
  password: Environment.PostgresqlPassword,
  port: Environment.PostgresqlPort,
  user: Environment.PostgresqlUser,
});

export const useClient = async <T>(caller: Caller, callback: Callback<T>) => {
  const observeRequestDuration = databaseRequestDuration.startTimer();
  const onDatabase =
    (status: "error" | "success", client?: PoolClient) => (result: unknown) => {
      const connected = client !== undefined;
      if (connected) client.release(status === "error");

      const labels = { caller, connected: `${connected}`, status };
      const requestDuration = observeRequestDuration(labels);
      const childLogger = logger.child({ labels, requestDuration });

      if (status === "error") {
        childLogger.error(result, "ON_DATABASE_ERROR");
        throw result;
      } else if (requestDuration >= 0.1) {
        childLogger.warn(result, "ON_DATABASE_SUCCESS_SLOW");
        return result as T;
      } else {
        childLogger.debug(result, "ON_DATABASE_SUCCESS");
        return result as T;
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

export const useTransaction = <T>(caller: Caller, callback: Callback<T>) =>
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
