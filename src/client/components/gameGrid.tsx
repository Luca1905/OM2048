import { useState } from "react";
import { FixedSizeGrid as Grid } from "react-window";
import type { GameState } from "../types/game";
import Game2048 from "./game-2048";

export interface GridProps {
  gameStates: GameState[];
  handleLocalStateChange: (gameState: GameState) => Promise<void>;
}

export default function GameGrid({
  gameStates,
  handleLocalStateChange,
}: GridProps) {
  const [selected, setSelected] = useState<string>("");

  return (
    <Grid
      columnCount={1000}
      columnWidth={480}
      height={480 * 4}
      rowCount={1000}
      rowHeight={480}
      width={480 * 4}
    >
      {({ columnIndex, rowIndex, style }) => {
        const gameState = gameStates[rowIndex * 1000 + columnIndex];
        if (!gameState) return <div>No game</div>;
        return (
          <Game2048
            key={gameState.id}
            id={gameState.id}
            active={gameState.id === selected}
            initialGameState={gameState}
            onClick={() => setSelected(gameState.id)}
            handleGameStateChange={handleLocalStateChange}
            style={style}
          />
        );
      }}
    </Grid>
  );
}
