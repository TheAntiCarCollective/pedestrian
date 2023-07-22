import { createClient } from "redis";

import { ProcessEnv } from "../constants";

const redis = createClient({
  url: `redis://${ProcessEnv.REDIS_HOST}:${ProcessEnv.REDIS_PORT}`,
});

redis.on("error", (error) => console.error("Redis Client Error", error));

export default redis;
