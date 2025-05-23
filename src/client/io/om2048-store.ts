import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import type { Response } from "src/shared/events";
import type { GameState } from "../types/game";

export class OM2048Store {
  public gameStates: GameState[] = [];
  private socket: Socket;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.socket = io(process.env.BACKEND_URL || "http://localhost:3001");

    this.socket.on("connect", () => {
      console.log("Connected to server");
      this.loadGames();
    });

    this.socket.on("game:list", (res: Response<GameState[]>) => {
      if ("error" in res) {
        console.error("Error loading games:", res.error);
        return;
      }
      this.gameStates = res.data;
      this.notifyListeners();
    });

    this.socket.on("game:updated", (newGameState: GameState) => {
      const index = this.gameStates.findIndex(
        (game) => game.id === newGameState.id,
      );
      if (index !== -1) {
        this.gameStates[index] = newGameState;
        this.notifyListeners();
      }
    });

    this.socket.on("games:created", (newGames: GameState[]) => {
      this.gameStates.push(...newGames);
      this.notifyListeners();
    });
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private loadGames() {
    this.socket.emit("game:list");
  }

  updateGame(gameState: GameState): Promise<{ success: boolean }> {
    return new Promise((resolve) => {
      this.socket.emit("game:update", gameState, (res: Response<GameState>) => {
        if ("error" in res) {
          console.error("Error updating game:", res.error);
          resolve({ success: false });
        } else {
          resolve({ success: true });
        }
      });
    });
  }

  createGames(gameStates: GameState[]): Promise<{ success: boolean }> {
    return new Promise((resolve) => {
      this.socket.emit(
        "games:create",
        gameStates,
        (res: Response<GameState[]>) => {
          if ("error" in res) {
            console.error("Error creating games:", res.error);
            resolve({ success: false });
          } else {
            resolve({ success: true });
          }
        },
      );
    });
  }

  private getByStatus(status: GameState["status"]) {
    return this.gameStates.filter((game: GameState) => game.status === status);
  }

  getWon() {
    return this.getByStatus("won");
  }

  getLost() {
    return this.getByStatus("lost");
  }

  getOngoing() {
    return this.getByStatus("ongoing");
  }

  disconnect() {
    this.socket.disconnect();
  }
}

export const om2048Store = new OM2048Store();
