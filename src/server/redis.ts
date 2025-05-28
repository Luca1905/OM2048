import { createClient } from "redis";

const redis = createClient({
  url: process.env.UPSTASH_REDIS_URL,
  disableClientInfo: true,
});

redis.on('error', error => {
    console.error('Redis client error:', error);
});

await redis.connect();


export { redis };
