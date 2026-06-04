import { type Server as HttpServer, createServer } from "node:http";

import type { ServerOptions } from "socket.io";
import { Server } from "socket.io";
import SuperJSON from "superjson";

import {
  type ClientEvents,
  type GameID,
  type PaginatedGamesResponse,
  type ServerEvents,
  type SocketData,
  type StoredState,
  gameIDSchema,
  storedStateSchema,
} from "../shared/events";
import { decodeBoard, encodeBoard, isHuffmanEncoded } from "../shared/huffman";

import { isNil, zip } from "lodash";
import { v4 as uuid } from "uuid";
import { z } from "zod/v4";
import { redis } from "./redis";

// --- Constants ---
const REDIS_GAME_PREFIX = "game:";
const WS_UPDATE_CHANNEL = "game:updated";
const PAGE_SIZE = 50;

function parseStoredGame(raw: string): StoredState {
  if (isHuffmanEncoded(raw)) {
    return decodeBoard(raw);
  }
  return storedStateSchema.parse(SuperJSON.parse(raw));
}

function serializeGame(board: StoredState): string {
  return encodeBoard(board);
}

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
    const parsedBoard = parseStoredGame(res);
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
      serializeGame(validState),
    );

    callback(null, validId);
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
    redis.SET(key, serializeGame(validState));
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
  cursor: string | null,
  callback: (
    error: string | null,
    result: PaginatedGamesResponse | null,
  ) => void,
) {
  try {
    const scanCursor = cursor ?? "0";
    const scanResult = await redis.scan(scanCursor, {
      TYPE: "string",
      MATCH: "game:*",
      COUNT: PAGE_SIZE,
    });

    const keys = scanResult.keys;
    const nextCursor = scanResult.cursor === "0" ? null : scanResult.cursor;

    if (keys.length === 0) {
      callback(null, { games: [], cursor: nextCursor, total: 0 });
      return;
    }

    const results = await redis.MGET(keys);
    const games: SocketData[] = [];

    for (const [fullKey, raw] of zip(keys, results)) {
      if (isNil(raw) || fullKey === undefined) continue;
      try {
        const gameIdString = fullKey.replace(REDIS_GAME_PREFIX, "");
        const idValidation = gameIDSchema.safeParse(gameIdString);
        if (!idValidation.success) continue;
        const board = parseStoredGame(raw);
        games.push({ id: idValidation.data, board });
      } catch (parseError) {
        console.error(
          "Failed to parse game from key:",
          fullKey,
          parseError instanceof Error ? parseError.message : parseError,
        );
      }
    }

    callback(null, { games, cursor: nextCursor, total: games.length });
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

      setGame(payload, (error, gameId) => {
        if (error !== null || gameId === null) {
          callback(error ?? "Failed to update game state.", null);
          return;
        }

        socket.broadcast.emit(
          WS_UPDATE_CHANNEL,
          {
            id: gameId,
            board: payload.board,
          },
          () => {
            console.log(
              `Published update for game ${gameId} to ${WS_UPDATE_CHANNEL}`,
            );
          },
        );

        callback(null, gameId);
      });
    });

    socket.on("games:list", (cursor, callback) => listGames(cursor, callback));
    socket.on("games:create", (payload, callback) => {
      createGames(payload, (error, ids) => {
        if (error !== null) {
          callback("Failed creating games", ids);
          return;
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

const httpServer: HttpServer = createServer();

const allowedOrigins = process.env.VITE_FRONTEND_URL
  ? process.env.VITE_FRONTEND_URL.split(",")
  : ["http://localhost:5173"];

console.log("Allowed origins:", allowedOrigins);
console.log(
  "UPSTASH_REDIS_URL set:",
  process.env.UPSTASH_REDIS_URL !== undefined,
);

createApplication(httpServer, {
  cors: {
    origin: allowedOrigins,
  },
});

const PORT = Number(process.env.PORT) || 3000;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT}`);
});
