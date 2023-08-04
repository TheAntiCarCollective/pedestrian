import { createClient, createCluster } from "redis";

import Environment from "../environment";

const url = `redis://${Environment.REDIS_HOST}:${Environment.REDIS_PORT}`;
const username = Environment.REDIS_USERNAME;
const password = Environment.REDIS_PASSWORD;

const createRedisByCluster = () =>
  createCluster({
    rootNodes: [{ url }],
    defaults: {
      username,
      password,
    },
  });

const createRedisByClient = () =>
  createClient({
    url,
    username,
    password,
  });

const redis =
  Environment.REDIS_CLUSTER === "true"
    ? createRedisByCluster()
    : createRedisByClient();

redis.on("error", (error) => {
  console.error("Redis Client Error", error);
});

export default redis;
