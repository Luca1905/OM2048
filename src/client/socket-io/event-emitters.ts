import type {
  GameID,
  Response,
  SocketData,
  StoredState,
} from "../../shared/events";
import { boardWithIDsToNumberBoard } from "../lib/util";
import type { GameState } from "../types/game";
import { socket } from "./socket";

export async function loadGames(): Promise<Response<SocketData[]>> {
  return new Promise((resolve) => {
    socket.emit(
      "games:list",
      (error: string | null, states: SocketData[] | null) => {
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
    const boardWithNumbers = boardWithIDsToNumberBoard(
      gameState.board,
      gameState.tilesById,
    );
    socket.emit(
      "game:update",
      { id: gameState.id, board: boardWithNumbers },
      (error: string | null, returnedGameID: GameID | null) => {
        if (error !== null) {
          console.error("Error updating game:", error);
          resolve({ success: false });
        } else {
          resolve({ success: gameState.id === returnedGameID });
        }
      },
    );
  });
}

export async function createGames(
  states: StoredState[],
): Promise<{ success: boolean }> {
  return new Promise((resolve) => {
    socket.emit(
      "games:create",
      states,
      (error: string | null, success: boolean) => {
        if (error !== null) {
          console.error("Error creating games:", error);
          resolve({ success: false });
        } else {
          resolve({ success });
        }
      },
    );
  });
}

export function getByStatus(
  status: GameState["status"],
  gameStates: GameState[],
) {
  return gameStates.filter((game: GameState) => game.status === status);
}
