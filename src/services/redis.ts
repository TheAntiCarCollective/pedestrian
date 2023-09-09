import { Redis } from "ioredis";
import loggerFactory from "pino";

import Environment from "../environment";

const logger = loggerFactory({
  name: __filename,
});

const node = {
  host: Environment.RedisHost,
  port: parseInt(Environment.RedisPort),
};

const user = {
  username: Environment.RedisUsername,
  password: Environment.RedisPassword,
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
  Environment.RedisCluster === "true"
    ? createRedisByCluster()
    : createRedisByClient();

redis.on("error", (error) => {
  logger.error(error, "REDIS_ERROR");
});

export default redis;
