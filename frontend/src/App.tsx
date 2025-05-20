import styles from "./index.module.css";
import Game2048 from "./twenty48/components/game-2028";
import { uid } from "uid";

function App() {
  return (
    <div className={styles.twenty48}>
      <header>
        <h1>2048</h1>
      </header>
      <main>
        <Game2048 id={uid()} />
        <Game2048 id={uid()} />
        <Game2048 id={uid()} />
        <Game2048 id={uid()} />
      </main>
    </div>
  );
}

export default App;
