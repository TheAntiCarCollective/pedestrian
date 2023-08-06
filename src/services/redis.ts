import { Redis } from "ioredis";
import loggerFactory from "pino";

import Environment from "../environment";

const logger = loggerFactory({
  name: __filename,
});

const node = {
  host: Environment.REDIS_HOST,
  port: parseInt(Environment.REDIS_PORT),
};

const user = {
  username: Environment.REDIS_USERNAME,
  password: Environment.REDIS_PASSWORD,
};

const createRedisByCluster = () =>
  new Redis.Cluster([node], {
    redisOptions: {
      ...user,
    },
  });

const createRedisByClient = () =>
  new Redis({
    ...node,
    ...user,
  });

const redis =
  Environment.REDIS_CLUSTER === "true"
    ? createRedisByCluster()
    : createRedisByClient();

redis.on("error", (error) => {
  logger.error(error, "REDIS_ERROR");
});

export default redis;
