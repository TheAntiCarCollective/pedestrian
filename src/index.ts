import discord from "./services/discord";
import redis from "./services/redis";

// Install
import "./features";

redis
  .connect()
  .then(() => discord.login())
  .catch(console.error);
