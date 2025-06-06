import type React from "react";
import { memo, useCallback, useEffect, useRef } from "react";
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
    const { moveTiles, gameState } = useGameContext(initialGameState);

    const localMoveRef = useRef(false);

    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        if (!active) return;
        if (
          ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)
        ) {
          e.preventDefault();
          localMoveRef.current = true;
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
        }
      },
      [active, moveTiles],
    );

    useEffect(() => {
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
      };
    }, [handleKeyDown]);

    useEffect(() => {
      if (localMoveRef.current && gameState.hasChanged === false) {
        handleGameStateChange(gameState);
        console.log("Triggered rerender with change: ", gameState);
        localMoveRef.current = false;
      }
    }, [gameState.hasChanged, handleGameStateChange, gameState]);

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
