import { z } from "zod/v4";

export const gameIDSchema = z.uuidv4();
export type GameID = z.infer<typeof gameIDSchema>;

export const storedStateSchema = z.number().nullable().array().array();
export type StoredState = z.infer<typeof storedStateSchema>;

export interface SocketData {
  id: GameID;
  board: StoredState;
}

interface Error {
  error: string;
  errorDetails?: string;
}

export type Response<T> = Error | { data: T };

export interface ServerEvents {
  "game:updated": (
    payload: SocketData,
    callback: (error: string | null, success: boolean) => void,
  ) => void;
}

export interface PaginatedGamesResponse {
  games: SocketData[];
  cursor: string | null;
  total: number;
}

export interface ClientEvents {
  "games:list": (
    cursor: string | null,
    callback: (
      error: string | null,
      result: PaginatedGamesResponse | null,
    ) => void,
  ) => void;
  "games:create": (
    payload: StoredState[],
    callback: (error: string | null, ids: (GameID | null)[]) => void,
  ) => void;
  "game:read": (
    id: GameID,
    callback: (error: string | null, state: SocketData | null) => void,
  ) => void;
  "game:update": (
    payload: SocketData,
    callback: (error: string | null, gameID: GameID | null) => void,
  ) => void;
}
