import { isNil, throttle } from "lodash";
import type { PropsWithChildren } from "react";
import { createContext, useCallback, useEffect, useReducer } from "react";
import {
  gameWinTileValue,
  mergeAnimationDuration,
  tileCountPerDimension,
} from "./constants";
import gameReducer, { initialState } from "./game-reducer";
import type { Tile } from "./models";

type MoveDirection = "move_up" | "move_down" | "move_left" | "move_right";

export const GameContext = createContext({
  score: 0,
  status: "ongoing",
  moveTiles: (_: MoveDirection) => { },
  getTiles: () => [] as Tile[],
  startGame: () => { },
});

export default function GameProvider({ children }: PropsWithChildren) {
  const [gameState, dispatch] = useReducer(gameReducer, initialState);

  const getEmptyCells = () => {
    const results: [number, number][] = [];

    for (let x = 0; x < tileCountPerDimension; x++) {
      for (let y = 0; y < tileCountPerDimension; y++) {
        if (isNil(gameState.board[y]?.[x])) {
          results.push([x, y]);
        }
      }
    }
    return results;
  };

  const appendRandomTile = () => {
    const emptyCells = getEmptyCells();
    if (emptyCells.length > 0) {
      const cellIndex = Math.floor(Math.random() * emptyCells.length);
      const newTile = {
        position: emptyCells[cellIndex] as [number, number],
        value: 2,
      };
      dispatch({ type: "create_tile", tile: newTile });
    }
  };

  const getTiles = () => {
    return gameState.tilesByIds.map((tileId) => gameState.tiles[tileId]!);
  };

  const moveTiles = useCallback(
    throttle(
      (type: MoveDirection) => dispatch({ type }),
      mergeAnimationDuration * 1.05,
      { trailing: false },
    ),
    [dispatch],
  );

  const startGame = () => {
    dispatch({ type: "reset_game" });
    dispatch({ type: "create_tile", tile: { position: [0, 1], value: 2 } });
    dispatch({ type: "create_tile", tile: { position: [0, 2], value: 2 } });
  };

  const checkGameState = () => {
    const { tiles, board } = gameState;
    const n = tileCountPerDimension;

    const isWon = Object.values(tiles).some(
      (t) => t.value === gameWinTileValue,
    );
    if (isWon) {
      dispatch({ type: "update_status", status: "won" });
      return;
    }

    for (let x = 0; x < n; x += 1) {
      for (let y = 0; y < n; y += 1) {
        const id = board[x]?.[y];
        if (id == null) {
          return;
        }
        const tile = tiles[id];
        if (!tile) {
          return;
        }
        const value = tile.value;

        if (x + 1 < n) {
          const rightId = board[x + 1]?.[y];
          if (isNil(rightId)) {
            return;
          }
          const rightTile = tiles[rightId];
          if (rightTile && rightTile.value === value) {
            return;
          }
        }

        if (y + 1 < n) {
          const downId = board[x]?.[y + 1];
          if (isNil(downId)) {
            return;
          }
          const downTile = tiles[downId];
          if (downTile && downTile.value === value) {
            return;
          }
        }
      }
    }

    dispatch({ type: "update_status", status: "lost" });
  };

  useEffect(() => {
    if (gameState.hasChanged) {
      setTimeout(() => {
        dispatch({ type: "clean_up" });
        appendRandomTile();
      }, mergeAnimationDuration);
    }
  }, [gameState.hasChanged]);

  useEffect(() => {
    if (!gameState.hasChanged) {
      checkGameState();
    }
  }, [gameState.hasChanged]);

  return (
    <GameContext.Provider
      value={{
        score: gameState.score,
        status: gameState.status,
        getTiles,
        moveTiles,
        startGame,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
