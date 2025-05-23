import type { Socket } from "socket.io";
import SuperJSON from "superjson";
import { z } from "zod/v4";
import {
  type ClientEvents,
  type GameID,
  type GameState,
  type Response,
  type ServerEvents,
  gameIDSchema,
  gameStateSchema,
} from "../shared/events";
import redis from "./redis";
import { Errors } from "./util";
import { sanitizeErrorMessage } from "./util";

export default function createOM2048Handlers() {
  return {
    updateGame: async (
      payload: GameState,
      callback: (res: Response<GameID>) => void,
    ) => {
      // @ts-ignore
      const socket: Socket<ClientEvents, ServerEvents> = this;
      const { error, data, success } = gameStateSchema.safeParse(payload);

      if (!success) {
        return callback({
          error: Errors.INVALID_PAYLOAD,
          errorDetails: z.prettifyError(error),
        });
      }

      try {
        await redis.SET(`game:${data.id}`, SuperJSON.stringify(data));
      } catch (e) {
        return callback({
          error: sanitizeErrorMessage(e),
        });
      }

      callback({
        data: data.id,
      });

      socket.broadcast.emit("game:updated", data.id);
    },

    readGame: async (
      id: GameID,
      callback: (res: Response<GameState>) => void,
    ) => {
      const { error, data, success } = gameIDSchema.safeParse(id);
      if (!success) {
        return callback({
          error: Errors.INVALID_PAYLOAD,
          errorDetails: z.prettifyError(error),
        });
      }
      const parsedID = data;

      try {
        const gameStateJson = await redis.GET(`game:${parsedID}`);
        if (null === gameStateJson) {
          return callback({
            error: Errors.JSON_PARSING_FAILED,
          });
        }
        const rawGameState = SuperJSON.parse(gameStateJson);
        const parsedGameState = gameStateSchema.parse(rawGameState);
        callback({
          data: parsedGameState,
        });
      } catch (e) {
        callback({
          error: sanitizeErrorMessage(e),
        });
      }
    },

    listGames: async (callback: (res: Response<GameState[]>) => void) => {
      try {
        const redis_keys = await redis.KEYS("*");
        const gameStatesJson = await redis.MGET(redis_keys);
        const parsedGameStates: GameState[] = [];
        for (const json of gameStatesJson) {
          if (null === json) {
            return callback({
              error: Errors.JSON_PARSING_FAILED,
            });
          }
          const rawGameState = SuperJSON.parse(json);
          parsedGameStates.push(gameStateSchema.parse(rawGameState));
        }
        callback({
          data: parsedGameStates,
        });
      } catch (e) {
        callback({
          error: sanitizeErrorMessage(e),
        });
      }
    },

    createGames: async (
      gameStates: GameState[],
      callback: (res: Response<GameID[]>) => void,
    ) => {
      const storedIDs: string[] = [];
      try {
        for (const gameState of gameStates) {
          const result = await redis.set(
            `game:${gameState.id}`,
            SuperJSON.stringify(gameState),
          );
          if (null === result) {
            return callback({
              error: Errors.INVALID_PAYLOAD,
            });
          }
          storedIDs.push(result);
        }

        callback({
          data: storedIDs,
        });
      } catch (e) {
        callback({
          error: sanitizeErrorMessage(e),
        });
      }
    },
  };
}
