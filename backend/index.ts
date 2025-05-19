import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

type GameState = {
	gameId: string;
	state: any;
};

const gameStates = new Map<string, GameState>();

async function incrementCount() {
	const count = await redis.incr("count");
	return new Response(JSON.stringify({ count }), {
		status: 200,
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*",
		},
	});
}

async function getCount() {
	const count = (await redis.get("count")) ?? 0;
	return new Response(JSON.stringify({ count }), {
		status: 200,
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*",
		},
	});
}

async function pushGameState({ gameUID, gameState }: { gameUID: string, gameState: string}) {
	const gameStateResponse = await redis.set(`game:${gameUID}`, gameState);
	return new Response(JSON.stringify({ "gameState": gameStateResponse }), {
		status: 200,
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*",
		}
	});
}

const server = Bun.serve({
	routes: {
		"/api/count/increment": incrementCount,
		"/api/count": getCount,

		"/api/twenty48/state": {
			POST: async (req) => {
				const body = await req.json() as GameState;
				gameStates.set(body.gameId, body);
				return Response.json({ success: true });
			},
			GET: async (req) => {
				const url = new URL(req.url);
				const gameId = url.searchParams.get("gameId");
				if (!gameId) {
					return Response.json({ error: "Game ID is required" }, { status: 400 });
				}
				const gameState = gameStates.get(gameId);
				if (!gameState) {
					return Response.json({ error: "Game not found" }, { status: 404 });
				}
				return Response.json(gameState);
			},
		}
	},

	fetch(_req) {
		return new Response("Not Found", { status: 404 });
	},
});

console.log("Backend API on port:", server.port);
