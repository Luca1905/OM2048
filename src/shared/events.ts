import { z } from "zod/v4";

export const gameIDSchema = z.uuidv4();
export type GameID = z.infer<typeof gameIDSchema>;

export const storedStateSchema = z.number().nullable().array().array();
export type StoredState = z.infer<typeof storedStateSchema>;

interface Error {
  error: string;
  errorDetails?: string;
}

export type Response<T> = Error | { data: T };

export interface ServerEvents {
  "game:updated": ({ id, state }: { id: GameID; state: StoredState }) => void;
}
export interface ClientEvents {
  "games:list": (
    callback: (error: string | null, states: {id: GameID, board: StoredState}[] | null) => void,
  ) => void;
  "games:create": (
    payload: StoredState[],
    callback: (res: GameID[]) => void,
  ) => void;
  "game:read": (
    id: GameID,
    callback: (error: string | null, state: StoredState | null) => void,
  ) => void;
  "game:update": (
    payload: { id: GameID; board: StoredState },
    callback: (error: string | null, gameID: GameID | null) => void,
  ) => void;
}
