import type { GameID, Response, StoredState } from "../../shared/events";
import type { GameState } from "../types/game";
import { socket } from "./socket";

export async function loadGames(): Promise<Response<{ id: string; board: StoredState }[]>> {
  return new Promise((resolve) => {
    socket.emit(
      "games:list",
      (error: string | null, states: {id: string, board: StoredState}[] | null) => {
        if (error !== null) {
          console.error("Error loading game:", error);
          resolve({
            error: error,
          });
          return;
        }

        if (states === null) {
          console.error("Unknown error loading game");
          resolve({
            error: "Unknown Error",
          });
          return;
        }

        resolve({ data: states });
      },
    );
  });
}

export async function updateGame(
  gameState: GameState,
): Promise<{ success: boolean }> {
  return new Promise((resolve) => {
    socket.emit("game:update", gameState, (res: Response<GameID>) => {
      if ("error" in res) {
        console.error("Error updating game:", res.error);
        resolve({ success: false });
      } else {
        resolve({ success: true });
      }
    });
  });
}

export async function createGames(
  gameStates: GameState[],
): Promise<{ success: boolean }> {
  return new Promise((resolve) => {
    socket.emit("games:create", gameStates, (res: Response<GameState[]>) => {
      if ("error" in res) {
        console.error("Error creating games:", res.error);
        resolve({ success: false });
      } else {
        resolve({ success: true });
      }
    });
  });
}

export function getByStatus(
  status: GameState["status"],
  gameStates: GameState[],
) {
  return gameStates.filter((game: GameState) => game.status === status);
}
