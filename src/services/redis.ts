import { createClient } from "redis";

import Environment from "../environment";

const redis = createClient({
  url: `redis://${Environment.REDIS_HOST}:${Environment.REDIS_PORT}`,
  database: parseInt(Environment.REDIS_DATABASE),
  username: Environment.REDIS_USERNAME,
  password: Environment.REDIS_PASSWORD,
});

redis.on("error", (error) => console.error("Redis Client Error", error));

export default redis;
