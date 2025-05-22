import { createClient } from "redis";

const redis = createClient({
  url: "rediss://default:AUQSAAIjcDExODVhMTg2YThiNjY0ZWFjYTdiZGFlNDY5N2ViZDBiZXAxMA@adequate-boar-17426.upstash.io:6379",
  disableClientInfo: true,
});

redis.on("error", (err) => {
  throw err;
});

await redis.connect();

export default redis;
