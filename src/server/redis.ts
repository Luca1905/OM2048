import { createClient } from "redis";

const redis = createClient({
  url: process.env.UPSTASH_REDIS_URL,
  disableClientInfo: true,
});

redis.on("error", (err) => {
  throw err;
});

await redis.connect();

export default redis;
