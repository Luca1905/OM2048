import type React from "react";
import type { JSX } from "react";
import { memo } from "react";
import { tileCountPerDimension } from "../lib/constants";
import type { Tile as TileModel } from "../types/game";
import type { GameState } from "../types/game";
import Splash from "./splash";
import styles from "./styles/board.module.css";
import Tile from "./tile";

interface BoardProps {
  gameState: GameState;
}

const Board: React.FC<BoardProps> = memo(({ gameState }) => {
  const renderGrid = () => {
    const cells: JSX.Element[] = [];
    const totalCellsCount = tileCountPerDimension ** 2;

    for (let index = 0; index < totalCellsCount; index += 1) {
      cells.push(<div className={styles.cell} key={index} />);
    }

    return cells;
  };

  const renderTiles = () => {
    const tiles = gameState.tileIds.map(
      (tileId) => gameState.tilesById[tileId]!,
    );
    return tiles.map((tile: TileModel) => (
      <Tile key={`${tile.id}`} {...tile} />
    ));
  };
  return (
    <div className={styles.board}>
      {gameState.status === "won" && <Splash heading="You won!" type="won" />}
      {gameState.status === "lost" && <Splash heading="You lost!" />}
      <div className={styles.tiles}>{renderTiles()}</div>
      <div className={styles.grid}>{renderGrid()}</div>
    </div>
  );
});

Board.displayName = "Board";

export default Board;
