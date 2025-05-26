import { isNil } from "lodash";
import { useCallback, useEffect, useReducer } from "react";
import { v4 as uuidv4 } from "uuid";
import { gameWinTileValue, tileCountPerDimension } from "../lib/constants";
import gameReducer from "../reducers/game-reducer";
import { socket } from "../socket-io/socket";
import type { GameState } from "../types/game";

type MoveDirection = "move_up" | "move_down" | "move_left" | "move_right";

export const useGameContext = (initialGameState: GameState) => {
  const [gameState, dispatch] = useReducer(gameReducer, initialGameState);

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
        id: uuidv4(),
        position: emptyCells[cellIndex] as [number, number],
        value: 2,
      };
      dispatch({ type: "create_tile", tile: newTile });
    }
  };

  const getTiles = () => {
    return gameState.tileIds.map((tileId) => gameState.tilesById[tileId]!);
  };

  const moveTiles = useCallback(
    (type: MoveDirection) => dispatch({ type }),
    [dispatch],
  );

  const startGame = (newGameID: string) => {
    dispatch({ type: "reset_game", newGameID });
    appendRandomTile();
    appendRandomTile();
  };

  const checkGameState = () => {
    const { tilesById: tiles, board } = gameState;
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
        if (isNil(id)) {
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
      dispatch({ type: "clean_up" });
      appendRandomTile();
    }
  }, [gameState.hasChanged]);

  useEffect(() => {
    if (!gameState.hasChanged) {
      checkGameState();
    }
  }, [gameState.hasChanged]);

  useEffect(() => {
    socket.emit("game:update");
  }, [gameState]);

  return {
    score: gameState.score,
    status: gameState.status,
    getTiles,
    moveTiles,
    startGame,
    gameState,
  };
};
