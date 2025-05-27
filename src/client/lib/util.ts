import _, { isNil } from "lodash";
import { v4 as uuid } from "uuid";
import type { GameState, GameStatus, Tile, TileMap } from "../types/game";
import { gameWinTileValue, tileCountPerDimension } from "./constants";

export function inferGameStateByBoard({
  id,
  board,
}: {
  id: string;
  board: (number | null)[][];
}): GameState {
  const newBoard: (string | null)[][] = Array(4)
    .fill(null)
    .map(() => Array(4).fill(null));
  const newTileMap: TileMap = {};
  const newTileIds: string[] = [];
  let score = 0;

  for (let y = 0; y < board.length; y++) {
    for (let x = 0; x < board[0]!.length; x++) {
      const oldValue = board[y]![x];
      if (!isNil(oldValue)) {
        const newTileID = uuid();
        newBoard[y]![x] = newTileID;

        const newTile: Tile = {
          id: newTileID,
          position: [x, y],
          value: oldValue,
        };
        newTileMap[newTileID] = newTile;

        newTileIds.push(newTileID);

        score += oldValue;
      } else {
        newBoard[y]![x] = null;
      }
    }
  }

  return {
    id,
    board: newBoard,
    tilesById: newTileMap,
    tileIds: newTileIds,
    hasChanged: false,
    score,
    status: checkGameState({ tilesById: newTileMap, board: newBoard }),
  };
}

const checkGameState = (gameState: {
  tilesById: TileMap;
  board: (string | null)[][];
}): GameStatus => {
  const { tilesById: tiles, board } = gameState;
  const n = tileCountPerDimension;

  const isWon = Object.values(tiles).some((t) => t.value === gameWinTileValue);
  if (isWon) {
    return "won";
  }

  for (let x = 0; x < n; x += 1) {
    for (let y = 0; y < n; y += 1) {
      const id = board[x]?.[y];
      if (isNil(id)) {
        return "ongoing";
      }
      const tile = tiles[id];
      if (!tile) {
        return "ongoing";
      }
      const value = tile.value;

      if (x + 1 < n) {
        const rightId = board[x + 1]?.[y];
        if (isNil(rightId)) {
          return "ongoing";
        }
        const rightTile = tiles[rightId];
        if (rightTile && rightTile.value === value) {
          return "ongoing";
        }
      }

      if (y + 1 < n) {
        const downId = board[x]?.[y + 1];
        if (isNil(downId)) {
          return "ongoing";
        }
        const downTile = tiles[downId];
        if (downTile && downTile.value === value) {
          return "ongoing";
        }
      }
    }
  }

  return "lost";
};

export function boardWithIDsToNumberBoard(
  boardWithIDs: (string | null)[][],
  tilesByID: TileMap,
): (number | null)[][] {
  const newBoard: (number | null)[][] = Array(4)
    .fill(null)
    .map(() => Array(4).fill(null));

  for (let x = 0; x < boardWithIDs.length; x += 1) {
    for (let y = 0; y < boardWithIDs.length; y += 1) {
      const tileID = boardWithIDs[x]![y];
      if (isNil(tileID)) {
        newBoard[x]![y] = null;
        continue;
      }
      const tile = tilesByID[tileID];
      if (isNil(tile)) {
        console.error("Error transforming board: ", boardWithIDs);
        console.error("Tile Map: ", tilesByID);
        return newBoard;
      }
      newBoard[x]![y] = tile.value;
    }
  }

  return newBoard;
}
