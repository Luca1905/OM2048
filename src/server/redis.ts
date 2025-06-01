import { createClient } from "redis";

const redis = createClient({
  url: process.env.UPSTASH_REDIS_URL,
  disableClientInfo: true,
});

redis.on("error", (err) => console.error("client error", err));
redis.on("connect", () => console.log("client is connect"));
redis.on("reconnecting", () => console.log("client is reconnecting"));
redis.on("ready", () => console.log("client is ready"));

await redis.connect();

export { redis };
