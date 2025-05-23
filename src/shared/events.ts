import { z } from "zod/v4";

export const gameIDSchema = z.uuidv4();
export type GameID = z.infer<typeof gameIDSchema>;

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

interface Error {
  error: string;
  errorDetails?: string;
}

interface Success<T> {
  data: T;
}

export type Response<T> = Error | Success<T>;

export interface ServerEvents {
  "game:updated": (id: GameID) => void;
}

export interface ClientEvents {
  "games:list": (callback: () => void) => void;
  "games:create": (
    payload: GameState[],
    callback: (res: Response<GameID[]>) => void,
  ) => void;
  "game:read": (
    payload: GameID,
    callback: (res: Response<GameState>) => void,
  ) => void;
  "game:update": (
    payload: GameState,
    callback: (res: Response<GameID>) => void,
  ) => void;
}
