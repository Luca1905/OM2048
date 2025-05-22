import { TRPCError } from "@trpc/server";
import * as trpcExpress from "@trpc/server/adapters/express";
import cors from "cors";
import express from "express";
import SuperJSON, { type SuperJSONResult } from "superjson";
import { z } from "zod/v4";
import redis from "./redis";
import { createContext, publicProcedure, router } from "./trpc";

export const gameStateSchema = z.object({
  id: z.uuidv4(),
  board: z.string().or(z.null()).array().array(),
  tilesById: z.record(
    z.uuidv4(),
    z.object({
      id: z.uuidv4(),
      position: z.tuple([z.number(), z.number()]),
      value: z.number(),
    }),
  ),
  tileIds: z.uuidv4().array(),
  hasChanged: z.boolean(),
  score: z.number(),
  status: z.enum(["ongoing", "won", "lost"]),
});

export const appRouter = router({
  listGameIDs: publicProcedure.query(async () => {
    const [_, ids]: [string, string[]] = await redis.scan(0, {
      match: "game:*",
      count: 100,
      type: "string",
    });
    return ids.map((id: string) => id.split(":")[1] ?? "");
  }),

  listGamesByID: publicProcedure
    .input(z.array(z.string().min(1)))
    .query(async ({ input: gameIDs }) => {
      const superJsonResult: SuperJSONResult[] = await redis.mget(
        gameIDs.map((id) => `game:${id}`),
      );
      return superJsonResult.map((raw, idx) => {
        if (!raw) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Game ${gameIDs[idx]} not found`,
          });
        }
        try {
          return gameStateSchema.parse(SuperJSON.deserialize(raw));
        } catch (err) {
          console.error(err);
          throw new Error("Game parsing failed");
        }
      });
    }),

  getGame: publicProcedure
    .input(z.string().min(1))
    .query(async ({ input: gameId }) => {
      const superJsonResult = await redis.get<SuperJSONResult>(
        `game:${gameId}`,
      );
      if (!superJsonResult) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
      }
      return gameStateSchema.parse(SuperJSON.deserialize(superJsonResult));
    }),

  updateGame: publicProcedure
    .input(gameStateSchema)
    .mutation(async ({ input }) => {
      const gameState = input;
      const json = SuperJSON.stringify(gameState);

      try {
        await redis.set(`game:${gameState.id}`, json);
        return { success: true };
      } catch (err) {
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message: `Failed updating game with id: ${gameState.id}`,
        });
      }
    }),
});

export type AppRouter = typeof appRouter;

const allowedOrigins = ["http://localhost:5173"];
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-trpc-source",
    "trpc-accept",
  ],
  credentials: true,
};

async function main() {
  const app = express();
  app.use(cors(corsOptions));

  app.use((req, _res, next) => {
    console.log("⬅️ ", req.method, req.path, req.body ?? req.query);
    next();
  });

  app.use(
    "/trpc",
    trpcExpress.createExpressMiddleware({
      router: appRouter,
      createContext,
      onError:
        process.env.NODE_ENV === "development"
          ? ({ path, error }) => {
              console.error(
                `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
              );
            }
          : undefined,
    }),
  );

  app.get("/", (_req, res) => {
    res.send("tRPC server healthy");
  });

  app.listen(3000, () => {
    console.log("🚀 tRPC server listening on port 3000");
  });
}

void main();
