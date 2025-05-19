import { useCallback, useEffect, useRef } from "react";
import styles from "./index.module.css";
import Board from "./twenty48/components/board";
import { useGameContext } from "./twenty48/hooks/useGameContext";
import Score from "./twenty48/components/score";

function App() {
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
    <div className={styles.twenty48}>
      <header>
        <h1>2048</h1>
        <Score score={gameState.score}/>
      </header>
      <main>
        <Board gameState={gameState} />
      </main>
    </div>
  );
}

export default App;
