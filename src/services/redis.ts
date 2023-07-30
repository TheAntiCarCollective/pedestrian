import { createClient } from "redis";

import Environment from "../environment";

const redis = createClient({
  url: `redis://${Environment.REDIS_HOST}:${Environment.REDIS_PORT}`,
});

redis.on("error", (error) => console.error("Redis Client Error", error));

export default redis;
