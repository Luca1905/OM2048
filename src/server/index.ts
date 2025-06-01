import type { Server as HttpServer } from "node:http";
import { createServer } from "node:http";

import type { ServerOptions } from "socket.io";
import { Server } from "socket.io";
import SuperJSON from "superjson";

import {
  type ClientEvents,
  type GameID,
  type ServerEvents,
  type SocketData,
  type StoredState,
  gameIDSchema,
  storedStateSchema,
} from "../shared/events";

import { isNil, zip } from "lodash";
import { v4 as uuid } from "uuid";
import { z } from "zod/v4";
import { redis } from "./redis";

// --- Constants ---
const REDIS_GAME_PREFIX = "game:";
const WS_UPDATE_CHANNEL = "game:updated";

// --- Redis Helper Functions ---
async function getGame(
  id: GameID,
  callback: (error: string | null, gameData: SocketData | null) => void,
) {
  try {
    const idValidation = gameIDSchema.safeParse(id);
    if (!idValidation.success) {
      console.error(
        "Invalid game ID format for getGame:",
        id,
        idValidation.error instanceof z.ZodError && z.treeifyError
          ? z.treeifyError(idValidation.error)
          : idValidation.error.message,
      );
      callback("Invalid game ID format", null);
      return;
    }
    const validId = idValidation.data;

    const res = await redis.GET(`${REDIS_GAME_PREFIX}${validId}`);
    if (res === null) {
      console.log(`Game with id not found: ${validId}`);
      callback(null, null);
      return;
    }
    const parsedBoard = storedStateSchema.parse(SuperJSON.parse(res));
    console.log("Read board: ", parsedBoard);
    callback(null, { id: validId, board: parsedBoard });
  } catch (error) {
    console.error(`Error in getGame for ID ${id}:`, error);
    if (error instanceof z.ZodError) {
      callback("Failed to parse game state from Redis.", null);
    } else {
      callback("Failed to get game state.", null);
    }
  }
}

async function setGame(
  payload: SocketData,
  callback: (error: string | null, gameId: GameID | null) => void,
) {
  try {
    const idValidation = gameIDSchema.safeParse(payload.id);
    if (!idValidation.success) {
      console.error(
        "Invalid game ID format for updateGame:",
        payload.id,
        idValidation.error instanceof z.ZodError && z.prettifyError
          ? z.prettifyError(idValidation.error)
          : idValidation.error.message,
      );
      callback("Invalid game ID format", null);
      return;
    }
    const validId = idValidation.data;

    const stateValidation = storedStateSchema.safeParse(payload.board);
    if (!stateValidation.success) {
      console.error(
        `Invalid game state for updateGame (ID: ${validId}):`,
        stateValidation.error instanceof z.ZodError && z.prettifyError
          ? z.prettifyError(stateValidation.error)
          : stateValidation.error.message,
      );
      callback("Invalid game state data", null);
      return;
    }
    const validState = stateValidation.data;

    await redis.SET(
      `${REDIS_GAME_PREFIX}${validId}`,
      SuperJSON.stringify(validState),
    );
  } catch (error) {
    console.error(`Error in updateGame for ID ${payload.id}:`, error);
    callback("Failed to update game state.", null);
  }
}

async function createGames(
  payload: StoredState[],
  callback: (err: string | null, ids: (GameID | null)[]) => void,
) {
  const tasks = payload.map((data) => {
    const validState = storedStateSchema.parse(data);
    const id = uuid();
    const key = `${REDIS_GAME_PREFIX}${id}`;
    redis.SET(key, SuperJSON.stringify(validState));
    return id;
  });

  try {
    const responses = await Promise.all(tasks);
    callback(null, responses);
  } catch (err) {
    console.error("Error updating game states in Redis:", err);
    callback("Failed to update game state", []);
  }
}

async function listGames(
  callback: (error: string | null, gameDataList: SocketData[] | null) => void,
) {
  try {
    const gameList: SocketData[] = [];
    for await (const keys of redis.scanIterator({
      TYPE: "string",
      MATCH: "game:*",
      COUNT: 100,
    })) {
      const results = await redis.MGET(keys);
      for (const [fullKey, json] of zip(keys, results)) {
        if (!isNil(json) && fullKey !== undefined) {
          try {
            const gameIdString = fullKey.replace(REDIS_GAME_PREFIX, "");
            const idValidation = gameIDSchema.safeParse(gameIdString);

            if (!idValidation.success) {
              console.warn(
                `Skipping game with invalid ID format from key ${fullKey} during listGames:`,
                idValidation.error instanceof z.ZodError && z.prettifyError
                  ? z.prettifyError(idValidation.error)
                  : idValidation.error.message,
              );
              continue;
            }
            const validGameId = idValidation.data;
            const board = storedStateSchema.parse(SuperJSON.parse(json));
            gameList.push({
              id: validGameId,
              board: board,
            });
          } catch (parseError) {
            let errorContext = String(parseError);
            if (parseError instanceof z.ZodError && z.prettifyError) {
              errorContext = z.prettifyError(parseError);
            } else if (parseError instanceof Error) {
              errorContext = parseError.message;
            }
            console.error(
              "Failed to parse game state from Redis MGET result for key:",
              fullKey,
              errorContext,
              "JSON:",
              json,
            );
          }
        }
      }
    }
    callback(null, gameList);
  } catch (error) {
    console.error("Error in listGames:", error);
    callback("Failed to list games.", null);
  }
}

export function createApplication(
  httpServer: HttpServer,
  serverOptions: Partial<ServerOptions> = {},
): Server<ClientEvents, ServerEvents> {
  const io = new Server<ClientEvents, ServerEvents>(httpServer, serverOptions);
  io.on("connection", (socket) => {
    console.log(`Socket ${socket.id} connected.`);

    socket.on("game:read", (id, callback) => getGame(id, callback));

    socket.on("game:update", (payload, callback) => {
      if (
        !payload ||
        typeof payload.id === "undefined" ||
        typeof payload.board === "undefined"
      ) {
        callback("Invalid payload: 'id' and 'board' are required.", null);
        return;
      }
      setGame(payload, callback);
      socket.broadcast.emit(WS_UPDATE_CHANNEL, payload, (error) => {
        if (error !== null) {
          console.error(
            `Failed updating game for ${payload.id} to ${WS_UPDATE_CHANNEL}`,
          );
        }
        console.log(
          `Published update for game ${payload.id} to ${WS_UPDATE_CHANNEL}`,
        );
      });
    });

    socket.on("games:list", (callback) => listGames(callback));
    socket.on("games:create", (payload, callback) => {
      createGames(payload, (error, ids) => {
        if (error !== null) {
          callback("Failed creating games", ids);
        }
        callback(null, ids);
      });
    });

    socket.on("disconnect", (reason) => {
      console.log(`Socket ${socket.id} disconnected: ${reason}`);
    });
  });
  return io;
}

// --- Server Initialization ---
console.log("Creating Server ...");
const httpServer = createServer();

//check environment variables
console.log("Environment variables: ");
console.log("VITE_FRONTEND_URL: ", process.env.VITE_FRONTEND_URL);
console.log("VITE_BACKEND_URL: ", process.env.VITE_BACKEND_URL);
console.log("UPSTASH_REDIS_URL: ", process.env.UPSTASH_REDIS_URL !== undefined);

createApplication(httpServer, {
  cors: {
    origin: [process.env.VITE_FRONTEND_URL!],
  },
});

const PORT = Number(process.env.PORT) || 3000;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`HTTP server listening on port ${PORT}`);
});
