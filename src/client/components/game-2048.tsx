import type React from "react";
import { memo, useCallback, useEffect, useRef } from "react";
import SuperJSON from "superjson";
import { useGameContext } from "../hooks/useGameContext";
import type { GameState } from "../types/game";
import Board from "./board";

export interface GameProps {
  id: string;
  className?: string;
  style?: React.CSSProperties;
  active: boolean;
  initialGameState: GameState;
  onClick: () => void;
  handleGameStateChange: (gameState: GameState) => void;
}

const Game2048: React.FC<GameProps> = memo(
  ({
    id,
    className,
    style,
    active,
    initialGameState,
    onClick,
    handleGameStateChange,
  }) => {
    const { startGame, moveTiles, gameState } =
      useGameContext(initialGameState);
    const initialized = useRef(false);

    useEffect(() => {
      if (!initialized.current) {
        startGame(id);
        initialized.current = true;
      }
    }, [startGame]);

    useEffect(() => {
      console.log(SuperJSON.stringify(gameState));
      handleGameStateChange(gameState);
    }, [gameState]);

    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        if (!active) return;
        if (
          ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)
        ) {
          e.preventDefault();
        }
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
      [moveTiles, active],
    );

    useEffect(() => {
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
      };
    }, [handleKeyDown]);

    return (
      <div
        className={className}
        style={{
          ...(style || {}),
          border: active ? "2px solid red" : "2px solid transparent",
        }}
        onClick={onClick}
        onKeyDown={onClick}
      >
        <main>
          <Board gameState={gameState} />
        </main>
      </div>
    );
  },
);

Game2048.displayName = "Game2048";
export default Game2048;
