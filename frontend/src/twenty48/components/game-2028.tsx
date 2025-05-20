import type React from "react";
import { memo, useCallback, useEffect, useRef } from "react";
import { useGameContext } from "../hooks/useGameContext";
import type { GameProps } from "../types/game";
import Board from "./board";

const Game2048: React.FC<GameProps> = memo(({ id, className, style }) => {
  const { moveTiles, startGame, getGameState } = useGameContext();
  const gameState = getGameState();
  const initialized = useRef(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      e.preventDefault();

      switch (e.code) {
        case "ArrowUp":
          moveTiles("move_up");
          break;
        case "ArrowDown":
          moveTiles("move_down");
          break;
        case "ArrowLeft":
          moveTiles("move_left");
          break;
        case "ArrowRight":
          moveTiles("move_right");
          break;
      }
    },
    [moveTiles],
  );

  useEffect(() => {
    if (initialized.current === false) {
      startGame();
      initialized.current = true;
    }
  }, [startGame]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <div className={className} style={style}>
      <main>
        <Board gameState={gameState} />
      </main>
    </div>
  );
});

Game2048.displayName = "Game2048";

export default Game2048;
