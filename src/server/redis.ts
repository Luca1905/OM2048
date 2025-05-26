import { createClient } from "redis";

const redis = createClient({
  url: process.env.UPSTASH_REDIS_URL,
  disableClientInfo: true,
});

redis.on("error", (err) => {
  throw err;
});

await redis.connect();

const subscriber = redis.duplicate();
subscriber.on("error", (err) => console.error(err));
await subscriber.connect();

export { redis, subscriber };
