import type { Server as HttpServer } from "node:http";
import { createServer } from "node:http";

import type { ServerOptions } from "socket.io";
import { Server } from "socket.io";
import SuperJSON from "superjson";

import {
  type GameID,
  type StoredState,
  gameIDSchema,
  storedStateSchema,
} from "src/shared/events";
import type { ClientEvents, ServerEvents } from "../shared/events";

import { isNil, zip } from "lodash";
import { z } from "zod/v4";
import { redis, subscriber } from "./redis";

// --- Constants ---
const REDIS_GAME_PREFIX = "game:";
const REDIS_UPDATE_CHANNEL = "update_channel";

// --- Redis Helper Functions ---
async function getGame(
  id: GameID,
  callback: (error: string | null, state: StoredState | null) => void,
) {
  try {
    const idValidation = gameIDSchema.safeParse(id);
    if (!idValidation.success) {
      console.error(
        "Invalid game ID format for getGame:",
        id,
        idValidation.error.format(),
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
    const parsedState = storedStateSchema.parse(SuperJSON.parse(res));
    callback(null, parsedState);
  } catch (error) {
    console.error(`Error in getGame for ID ${id}:`, error);
    callback("Failed to get game state.", null);
  }
}

async function updateGame(
  id: GameID,
  state: StoredState,
  callback: (error: string | null, gameId: GameID | null) => void,
) {
  try {
    const idValidation = gameIDSchema.safeParse(id);
    if (!idValidation.success) {
      console.error(
        "Invalid game ID format for updateGame:",
        id,
        z.prettifyError(idValidation.error),
      );
      callback("Invalid game ID format", null);
      return;
    }
    const validId = idValidation.data;

    const stateValidation = storedStateSchema.safeParse(state);
    if (!stateValidation.success) {
      console.error(
        "Invalid game state for updateGame:",
        state,
        z.prettifyError(stateValidation.error),
      );
      callback("Invalid game state data", null);
      return;
    }
    const validState = stateValidation.data;

    await redis.SET(
      `${REDIS_GAME_PREFIX}${validId}`,
      SuperJSON.stringify(validState),
    );
    await publishGameUpdate(validId, validState);
    callback(null, validId);
  } catch (error) {
    console.error(`Error in updateGame for ID ${id}:`, error);
    callback("Failed to update game state.", null);
  }
}

async function listGames(
  callback: (
    error: string | null,
    states: { id: string; board: StoredState }[] | null,
  ) => void,
) {
  try {
    const keys = await redis.KEYS(`${REDIS_GAME_PREFIX}*`);
    if (!keys || keys.length === 0) {
      callback(null, []);
      return;
    }

    const results = await redis.MGET(keys);
    const gameStates: {
      id: GameID;
      board: StoredState;
    }[] = [];
    for (const [id, json] of zip(keys, results)) {
      if (!isNil(json) && id !== undefined) {
        try {
          gameStates.push({
            id: id,
            board: storedStateSchema.parse(SuperJSON.parse(json)),
          });
        } catch (parseError) {
          console.error(
            "Failed to parse game state from Redis MGET result:",
            parseError,
            "JSON:",
            json,
          );
        }
      }
    }
    callback(null, gameStates);
  } catch (error) {
    console.error("Error in listGames:", error);
    callback("Failed to list games.", null);
  }
}

async function publishGameUpdate(
  id: GameID,
  state: StoredState,
): Promise<void> {
  try {
    await redis.publish(
      REDIS_UPDATE_CHANNEL,
      SuperJSON.stringify({ id, state }),
    );
    console.log(`Published update for game ${id} to ${REDIS_UPDATE_CHANNEL}`);
  } catch (error) {
    console.error(
      `Failed to publish game update to Redis for ID ${id}:`,
      error,
    );
  }
}

export function createApplication(
  httpServer: HttpServer,
  serverOptions: Partial<ServerOptions> = {},
): Server<ClientEvents, ServerEvents> {
  const io = new Server<ClientEvents, ServerEvents>(httpServer, serverOptions);

  (async () => {
    try {
      if (!subscriber.isOpen) {
        await subscriber.connect();
        console.log("Redis subscriber client connected.");
      }

      subscriber.on("error", (err) => {
        console.error("Redis Subscriber Error:", err);
      });

      await subscriber.subscribe(
        REDIS_UPDATE_CHANNEL,
        (message: string, channel: string) => {
          if (channel === REDIS_UPDATE_CHANNEL) {
            console.log(
              `Received message from Redis channel "${channel}":`,
              message,
            );
            try {
              const rawData: {
                id: string;
                state: StoredState;
              } = SuperJSON.parse(message);

              if (
                rawData &&
                typeof rawData?.id !== "undefined" &&
                typeof rawData.state !== "undefined"
              ) {
                const idValidation = gameIDSchema.safeParse(rawData.id);
                const stateValidation = storedStateSchema.safeParse(
                  rawData.state,
                );

                if (idValidation.success && stateValidation.success) {
                  const eventData = {
                    id: idValidation.data,
                    state: stateValidation.data,
                  };
                  // Emit to all connected clients
                  io.emit("game:updated", eventData);
                  console.log(
                    `Emitted 'game:updated' for game ${eventData.id} to all clients.`,
                  );
                } else {
                  console.error(
                    `Invalid data in Redis message on channel ${REDIS_UPDATE_CHANNEL}:`,
                    {
                      idErrors: idValidation.success
                        ? null
                        : z.prettifyError(idValidation.error),
                      stateErrors: stateValidation.success
                        ? null
                        : z.prettifyError(stateValidation.error),
                      rawData,
                    },
                  );
                }
              } else {
                console.error(
                  `Malformed data structure in Redis message on channel ${REDIS_UPDATE_CHANNEL}:`,
                  rawData,
                );
              }
            } catch (e) {
              console.error(
                `Error processing message from Redis channel ${REDIS_UPDATE_CHANNEL}:`,
                e,
                "Raw message:",
                message,
              );
            }
          }
        },
      );
      console.log(
        `Redis subscriber listening to channel "${REDIS_UPDATE_CHANNEL}"`,
      );
    } catch (err) {
      console.error(
        "CRITICAL: Failed to initialize Redis pub/sub listener.",
        err,
      );
    }
  })();

  io.on("connection", (socket) => {
    console.log(`Socket ${socket.id} connected.`);

    socket.on("game:read", (id, callback) => getGame(id, callback));

    // socket.on("game:update", (payload, callback) => {
    //   if (
    //     !payload ||
    //     typeof payload.id === "undefined" ||
    //     typeof payload.board === "undefined"
    //   ) {
    //     callback("Invalid payload: 'id' and 'board' are required.", null);
    //     return;
    //   }
    //   updateGame(payload.id, payload.board, callback);
    // });

    socket.on("games:list", (callback) => listGames(callback));

    socket.on("disconnect", (reason) => {
      console.log(`Socket ${socket.id} disconnected: ${reason}`);
    });
  });

  return io;
}

// --- Server Initialization ---
if (require.main === module) {
  const httpServer = createServer();

  createApplication(httpServer, {
    cors: {
      origin: ["http://localhost:5173", "http://localhost:4173"],
    },
  });

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`HTTP server listening on port ${PORT}`);
  });
}
