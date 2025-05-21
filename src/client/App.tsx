import React, { useState, useEffect } from "react";
import Game2048 from "./components/game-2048";
import styles from "./styles/index.module.css";
import { trpc } from "./utils/trpc";

import type { GameState } from "./types/game";

function App() {
  const [gameStates, setGameStates] = useState<GameState[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    (async () => {
      const ids = await trpc.listGameIDs.query();
      const states: GameState[] = await trpc.listGamesByID.query(ids);
      setGameStates(states);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div />;

  async function handleGameStateChange(gameState: GameState) {
    const result = await trpc.updateGame.mutate(gameState);
    if (!result.success) {
      console.error("Failed updating game State");
    }
  }

  return (
    <div className={styles.twenty48}>
      <header>
        <h1>OM2048</h1>
      </header>
      <main>
        {gameStates.map((gameState) => (
          <Game2048
            key={gameState.id}
            id={gameState.id}
            active={gameState.id === selected}
            initialGameState={gameState}
            onClick={() => setSelected(gameState.id)}
            handleGameStateChange={handleGameStateChange}
          />
        ))}
      </main>
    </div>
  );
}

export default App;
