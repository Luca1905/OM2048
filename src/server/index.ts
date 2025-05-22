import cors from "cors";
import express from "express";
import http from "node:http";
import { isNil } from "lodash";
import { Server as SocketIOServer } from "socket.io";
import type { Socket } from "socket.io";
import SuperJSON from "superjson";
import { z } from "zod/v4"; 
import redis from "./redis";

export const gameStateSchema = z.object({
  id: z.uuidv4(),
  board: z.string().nullable().array().array(),
  tilesById: z.record(
    z.uuidv4(),
    z.object({
      id: z.uuidv4(),
      position: z.tuple([z.number(), z.number()]),
      value: z.number(),
    }),
  ),
  tileIds: z.uuidv4(),
  hasChanged: z.boolean(),
  score: z.number(),
  status: z.enum(["ongoing", "won", "lost"]),
});
export type GameState = z.infer<typeof gameStateSchema>;

// --- Express and Socket.IO Setup ---
const app = express();
const httpServer = http.createServer(app);

const allowedOrigins = ["http://localhost:5173"];
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

// --- Logging Middleware (similar to original for HTTP) ---
app.use((req, _res, next) => {
  console.log("⬅️ HTTP", req.method, req.path, req.body ?? req.query);
  next();
});

app.get("/", (_req, res) => {
  res.send("Express + Socket.IO server healthy");
});

// --- Socket.IO Event Handlers ---
io.on("connection", (socket: Socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);

  const handleError = (
    callback: Function | undefined,
    message: string,
    code?: string,
    details?: any,
  ) => {
    console.error(
      `❌ Socket Error for ${socket.id}: ${message} (Code: ${
        code || "UNKNOWN"
      })`,
      details || "",
    );
    if (typeof callback === "function") {
      callback({ error: { message, code, details } });
    } else {
      socket.emit("serverError", { error: { message, code, details } });
    }
  };

  socket.on("game:listIDs", async (callback) => {
    console.log(`[${socket.id}] requested game:listIDs`);
    try {
      const keysFromRedis: string[] = [];
      const keyIterator = redis.scanIterator({
        MATCH: "game:*",
        TYPE: "string", 
      });
      for await (const key of keyIterator) {
        keysFromRedis.push(...key);
      }
      const parsedIDs = keysFromRedis.map(
        (key: string) => key.split(":")[1] ?? "",
      );

      const validationResult = z.uuidv4().array().safeParse(parsedIDs);
      if (!validationResult.success) {
        console.error(
          "Server-side ID parsing/validation failed:",
          validationResult.error,
        );
        return handleError(
          callback,
          "Failed to parse game IDs on server.",
          "INTERNAL_SERVER_ERROR",
        );
      }

      if (typeof callback === "function") {
        callback({ data: validationResult.data });
      }
    } catch (error) {
      handleError(
        callback,
        "Failed to list game IDs.",
        "INTERNAL_SERVER_ERROR",
        error,
      );
    }
  });

  socket.on("game:listByIDs", async (gameIDsInput: unknown, callback) => {
    console.log(`[${socket.id}] requested game:listByIDs with`, gameIDsInput);
    try {
      const gameIDsSchema = z.array(z.string().min(1));
      const validationResult = gameIDsSchema.safeParse(gameIDsInput);

      if (!validationResult.success) {
        return handleError(
          callback,
          "Invalid input for game IDs.",
          "BAD_REQUEST",
          z.treeifyError(validationResult.error),
        );
      }
      const gameIDs = validationResult.data;

      const gameStatesJSON = await redis.MGET(
        gameIDs.map((id) => `game:${id}`),
      );

      const results: GameState[] = [];
      for (let i = 0; i < gameStatesJSON.length; i++) {
        const raw = gameStatesJSON[i];
        const gameId = gameIDs[i];
        if (!raw) {
          return handleError(
            callback,
            `Game ${gameId} not found`,
            "NOT_FOUND",
          );
        }
        try {
          results.push(gameStateSchema.parse(SuperJSON.parse(raw)));
        } catch (err) {
          console.error(`Error parsing game ${gameId}:`, err);
          return handleError(
            callback,
            `Game parsing failed for ${gameId}`,
            "INTERNAL_SERVER_ERROR",
            err,
          );
        }
      }

      if (typeof callback === "function") {
        callback({ data: results });
      }
    } catch (error) {
      handleError(
        callback,
        "Failed to list games by ID.",
        "INTERNAL_SERVER_ERROR",
        error,
      );
    }
  });

  socket.on("game:get", async (gameIdInput: unknown, callback) => {
    console.log(`[${socket.id}] requested game:get with ID:`, gameIdInput);
    try {
      const gameIdSchema = z.uuidv4();
      const validationResult = gameIdSchema.safeParse(gameIdInput);
      if (!validationResult.success) {
        return handleError(
          callback,
          "Invalid game ID format.",
          "BAD_REQUEST",
          z.treeifyError(validationResult.error),
        );
      }
      const gameId = validationResult.data;

      const superJsonResult = await redis.get(`game:${gameId}`);
      if (isNil(superJsonResult)) {
        return handleError(callback, "Game not found.", "NOT_FOUND");
      }

      const game = gameStateSchema.parse(SuperJSON.parse(superJsonResult));
      if (typeof callback === "function") {
        callback({ data: game });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        handleError(
          callback,
          "Game data parsing failed.",
          "INTERNAL_SERVER_ERROR",
          z.treeifyError(error),
        );
      } else {
        handleError(
          callback,
          "Failed to get game.",
          "INTERNAL_SERVER_ERROR",
          error,
        );
      }
    }
  });

  socket.on("game:update", async (gameStateInput: unknown, callback) => {
    console.log(`[${socket.id}] requested game:update`);
    try {
      const validationResult = gameStateSchema.safeParse(gameStateInput);
      if (!validationResult.success) {
        return handleError(
          callback,
          "Invalid game state data.",
          "BAD_REQUEST",
          z.treeifyError(validationResult.error),
        );
      }
      const gameState = validationResult.data;
      const json = SuperJSON.stringify(gameState);

      await redis.set(`game:${gameState.id}`, json);

      // Optional: Broadcast update to other clients (e.g., in a game room)
      // io.to(`game-${gameState.id}`).emit('game:updated', gameState);

      if (typeof callback === "function") {
        callback({ data: { success: true } });
      }
    } catch (error) {
      handleError(
        callback,
        "Failed to update game.",
        "SERVICE_UNAVAILABLE",
        error,
      );
    }
  });

  socket.on("game:createMultiple", async (gameStatesInput: unknown, callback) => {
    console.log(`[${socket.id}] requested game:createMultiple`);
    try {
      const gameStatesSchema = z.array(gameStateSchema);
      const validationResult = gameStatesSchema.safeParse(gameStatesInput);

      if (!validationResult.success) {
        return handleError(
          callback,
          "Invalid game states data.",
          "BAD_REQUEST",
          z.treeifyError(validationResult.error),
        );
      }
      const gameStates = validationResult.data;

      await Promise.all(
        gameStates.map(async (gameState) => {
          const json = SuperJSON.stringify(gameState);
          await redis.set(`game:${gameState.id}`, json);
        }),
      );

      if (typeof callback === "function") {
        callback({ data: { success: true } });
      }
    } catch (error) {
      handleError(
        callback,
        "Failed to create games.",
        "SERVICE_UNAVAILABLE",
        error,
      );
    }
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Express + Socket.IO server listening on port ${PORT}`);
});

