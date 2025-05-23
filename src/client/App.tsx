import React, { useState } from "react";
import Game2048 from "./components/game-2048";
import styles from "./styles/index.module.css";

import type { GameState } from "./types/game";

import { v4 as uuidv4 } from "uuid";
import { useOM2048Store } from "./hooks/useOM2048Store";

function App() {
  const { gameStates, loading, updateGame, createGames } = useOM2048Store();
  const [selected, setSelected] = useState<string>("");

  if (loading) return <div>Loading games...</div>;

  async function handleGameStateChange(gameState: GameState) {
    const result = await updateGame(gameState);
    if (!result.success) {
      console.error("Failed updating game State");
    }
  }

  const createInitialState = (): GameState => {
    const id1 = uuidv4();
    const id2 = uuidv4();
    return {
      id: uuidv4(),
      board: [
        [id1, id2, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
      ],
      tilesById: {
        [id1]: {
          id: id1,
          position: [0, 0],
          value: 2,
        },
        [id2]: {
          id: id2,
          position: [0, 1],
          value: 2,
        },
      },
      tileIds: [id1, id2],
      hasChanged: false,
      score: 0,
      status: "ongoing",
    };
  };

  async function fillRedis(count: number) {
    const newGameStates = new Array(count);
    for (let i = 0; i < count; i++) {
      newGameStates[i] = createInitialState();
    }
    console.log(newGameStates);
    const result = await createGames(newGameStates);
    if (!result.success) {
      console.error("Failed creating games");
    }
  }

  return (
    <div className={styles.twenty48}>
      <header>
        <h1>OM2048</h1>
      </header>
      <main>
        <button type="submit" onClick={async () => await fillRedis(400)}>
          CREATE 10.000 GAMES
        </button>
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
