export type Tile = {
  id: string;
  position: [number, number];
  value: number;
};

export type TileMap = {
  [id: string]: Tile;
};

type GameStatus = "ongoing" | "won" | "lost";

export type GameState = {
  id: string;
  board: string[][];
  tilesById: TileMap;
  tileIds: string[];
  hasChanged: boolean;
  score: number;
  status: GameStatus;
};

export type Action =
  | { type: "create_tile"; tile: Tile }
  | { type: "clean_up" }
  | { type: "move_up" }
  | { type: "move_down" }
  | { type: "move_left" }
  | { type: "move_right" }
  | { type: "reset_game" }
  | { type: "update_status"; status: GameStatus };
