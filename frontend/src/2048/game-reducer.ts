import { flattenDeep, isEqual, isNil } from "lodash";
import { uid } from "uid";
import { tileCountPerDimension } from "./constants";
import type { Tile, TileMap } from "./models";

type GameStatus = "ongoing" | "won" | "lost";

type State = {
  board: string[][];
  tilesById: TileMap;
  tileIds: string[];
  hasChanged: boolean;
  score: number;
  status: GameStatus;
};

type Action =
  | { type: "create_tile"; tile: Tile }
  | { type: "clean_up" }
  | { type: "move_up" }
  | { type: "move_down" }
  | { type: "move_left" }
  | { type: "move_right" }
  | { type: "reset_game" }
  | { type: "update_status"; status: GameStatus };

function createBoard() {
  const board: string[][] = [];

  for (let i = 0; i < tileCountPerDimension; i += 1) {
    board[i] = new Array(tileCountPerDimension).fill(undefined);
  }

  return board;
}

export const initialState: State = {
  board: createBoard(),
  tilesById: {},
  tileIds: [],
  hasChanged: false,
  score: 0,
  status: "ongoing",
};

export default function gameReducer(state: State, action: Action): State {
  switch (action.type) {
    case "clean_up": {
      const flattenBoard = flattenDeep(state.board);

      let newTiles: TileMap = {};
      for (let i = 0; i < flattenBoard.length; i++) {
        const tileId = flattenBoard[i];
        if (isNil(tileId)) {
          continue;
        }

        const tile = state.tilesById[tileId];
        if (!tile) {
          continue;
        }
        newTiles = {
          ...newTiles,
          [tileId]: tile,
        };
      }

      return {
        ...state,
        tilesById: newTiles,
        tileIds: Object.keys(newTiles),
        hasChanged: false,
      };
    }
    case "create_tile": {
      const tileId = uid();
      const [x, y] = action.tile.position;
      const newBoard = JSON.parse(JSON.stringify(state.board));
      newBoard[y][x] = tileId;

      return {
        ...state,
        board: newBoard,
        tilesById: {
          ...state.tilesById,
          [tileId]: {
            id: tileId,
            ...action.tile,
          },
        },
        tileIds: [...state.tileIds, tileId],
      };
    }
    case "move_up": {
      const newBoard = createBoard();
      const newTiles: TileMap = {};
      let hasChanged = false;
      let { score } = state;

      for (let x = 0; x < tileCountPerDimension; x++) {
        let newY = 0;
        let previousTile: Tile | undefined;

        for (let y = 0; y < tileCountPerDimension; y++) {
          const currentTileId = state.board[y]?.[x];
          if (isNil(currentTileId)) {
            continue;
          }
          const currentTile = state.tilesById[currentTileId];
          if (isNil(currentTile)) {
            continue;
          }

          if (previousTile?.value === currentTile.value) {
            score += previousTile.value * 2;
            newTiles[previousTile.id as string] = {
              ...previousTile,
              value: previousTile.value * 2,
            };
            newTiles[currentTileId] = {
              ...currentTile,
              position: [x, newY - 1],
            };
            previousTile = undefined;
            hasChanged = true;
            continue;
          }

          newBoard[newY]![x] = currentTileId;
          newTiles[currentTileId] = {
            ...currentTile,
            position: [x, newY],
          };
          previousTile = newTiles[currentTileId];
          if (!isEqual(currentTile.position, [x, newY])) {
            hasChanged = true;
          }
          newY++;
        }
      }
      return {
        ...state,
        board: newBoard,
        tilesById: newTiles,
        hasChanged,
        score,
      };
    }
    case "move_down": {
      const newBoard = createBoard();
      const newTiles: TileMap = {};
      let hasChanged = false;
      let { score } = state;

      for (let x = 0; x < tileCountPerDimension; x++) {
        let newY = tileCountPerDimension - 1;
        let previousTile: Tile | undefined;

        for (let y = tileCountPerDimension - 1; y >= 0; y--) {
          const currentTileId = state.board[y]?.[x];
          if (isNil(currentTileId)) {
            continue;
          }
          const currentTile = state.tilesById[currentTileId];
          if (isNil(currentTile)) {
            continue;
          }

          if (previousTile?.value === currentTile.value) {
            score += previousTile.value * 2;
            newTiles[previousTile.id as string] = {
              ...previousTile,
              value: previousTile.value * 2,
            };
            newTiles[currentTileId] = {
              ...currentTile,
              position: [x, newY + 1],
            };
            previousTile = undefined;
            hasChanged = true;
            continue;
          }

          newBoard[newY]![x] = currentTileId;
          newTiles[currentTileId] = {
            ...currentTile,
            position: [x, newY],
          };
          previousTile = newTiles[currentTileId];
          if (!isEqual(currentTile.position, [x, newY])) {
            hasChanged = true;
          }
          newY--;
        }
      }
      return {
        ...state,
        board: newBoard,
        tilesById: newTiles,
        hasChanged,
        score,
      };
    }
    case "move_left": {
      const newBoard = createBoard();
      const newTiles: TileMap = {};
      let hasChanged = false;
      let { score } = state;

      for (let y = 0; y < tileCountPerDimension; y++) {
        let newX = 0;
        let previousTile: Tile | undefined;

        for (let x = 0; x < tileCountPerDimension; x++) {
          const currentTileId = state.board[y]?.[x];
          if (isNil(currentTileId)) {
            continue;
          }
          const currentTile = state.tilesById[currentTileId];
          if (isNil(currentTile)) {
            continue;
          }
          if (previousTile?.value === currentTile.value) {
            score += previousTile.value * 2;
            newTiles[previousTile.id as string] = {
              ...previousTile,
              value: previousTile.value * 2,
            };
            newTiles[currentTileId] = {
              ...currentTile,
              position: [newX - 1, y],
            };
            previousTile = undefined;
            hasChanged = true;
            continue;
          }

          newBoard[y]![newX] = currentTileId;
          newTiles[currentTileId] = {
            ...currentTile,
            position: [newX, y],
          };
          previousTile = newTiles[currentTileId];
          if (!isEqual(currentTile.position, [newX, y])) {
            hasChanged = true;
          }
          newX++;
        }
      }
      return {
        ...state,
        board: newBoard,
        tilesById: newTiles,
        hasChanged,
        score,
      };
    }
    case "move_right": {
      const newBoard = createBoard();
      const newTiles: TileMap = {};
      let hasChanged = false;
      let { score } = state;

      for (let y = 0; y < tileCountPerDimension; y++) {
        let newX = tileCountPerDimension - 1;
        let previousTile: Tile | undefined;

        for (let x = tileCountPerDimension - 1; x >= 0; x--) {
          const currentTileId = state.board[y]?.[x];
          if (isNil(currentTileId)) {
            continue;
          }
          const currentTile = state.tilesById[currentTileId];
          if (isNil(currentTile)) {
            continue;
          }

          if (previousTile?.value === currentTile.value) {
            score += previousTile.value * 2;
            newTiles[previousTile.id as string] = {
              ...previousTile,
              value: previousTile.value * 2,
            };
            newTiles[currentTileId] = {
              ...currentTile,
              position: [newX + 1, y],
            };
            previousTile = undefined;
            hasChanged = true;
            continue;
          }

          newBoard[y]![newX] = currentTileId;
          newTiles[currentTileId] = {
            ...currentTile,
            position: [newX, y],
          };
          previousTile = newTiles[currentTileId];
          if (!isEqual(currentTile.position, [newX, y])) {
            hasChanged = true;
          }
          newX--;
        }
      }
      return {
        ...state,
        board: newBoard,
        tilesById: newTiles,
        hasChanged,
        score,
      };
    }
    case "reset_game":
      return initialState;
    case "update_status":
      return {
        ...state,
        status: action.status,
      };
    default:
      return state;
  }
}
