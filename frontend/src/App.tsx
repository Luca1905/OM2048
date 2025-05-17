import { useContext, useEffect, useState } from "react";
import Board from "./2048/components/board";
import "./App.css";
import { GameContext } from "./2048/game-context";

function App() {
  const [count, setCount] = useState(0);
  const { getTiles } = useContext(GameContext);

  async function getCount() {
    const url = "http://localhost:3000/api/count";
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }

      const data = await response.json();
      setCount(data.count);
    } catch (error) {
      let message;
      if (error instanceof Error) message = error.message;
      else message = String(error);
      console.error(message);
    }
  }

  async function incrementCount() {
    const url = "http://localhost:3000/api/count/increment";
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }

      const data = await response.json();
      setCount(data.count);
    } catch (error) {
      let message;
      if (error instanceof Error) message = error.message;
      else message = String(error);
      console.error(message);
    }
  }

  useEffect(() => {
    const gameStateJSON = JSON.stringify(getTiles());
    console.log(gameStateJSON);
  });

  return (
    <main>
      <Board />
    </main>
  );
}

export default App;
