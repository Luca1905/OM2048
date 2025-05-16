import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

async function incrementCount() {
  const count = await redis.incr("count");
  return new Response(JSON.stringify({ count }), {
    status: 200,
    headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*'},
  });
}

async function getCount() {
  const count = (await redis.get("count")) ?? 0;
  return new Response(JSON.stringify({ count }), {
    status: 200,
    headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*'},
  });
}

const server = Bun.serve({
  routes: {
    "/api/count/increment": incrementCount,
    "/api/count": getCount,
  },

  fetch(_req) {
    return new Response("Not Found", { status: 404 });
  },
});

console.log("Backend API on port:", server.port);
