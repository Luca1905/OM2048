import React, { useState, useMemo } from "react";
import { uid } from "uid";
import styles from "./index.module.css";
import Game2048 from "./twenty48/components/game-2048";

function App() {
  const [selected, setSelected] = useState<string>("");

  const gameIDs = useMemo<string[]>(
    () => Array.from({ length: 100 }, () => uid()),
    [],
  );

  return (
    <div className={styles.twenty48}>
      <header>
        <h1>2048</h1>
      </header>
      <main>
        {gameIDs.map((id) => (
          <Game2048
            key={id}
            id={id}
            active={id === selected}
            onClick={() => setSelected(id)}
          />
        ))}
      </main>
    </div>
  );
}

export default App;
