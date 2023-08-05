import { Redis } from "ioredis";

import Environment from "../environment";

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

export default Environment.REDIS_CLUSTER === "true"
  ? createRedisByCluster()
  : createRedisByClient();
