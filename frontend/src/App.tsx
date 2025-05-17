import { useEffect, useState } from "react";
import Board from "./2048/components/board";
import "./App.css";

function App() {
  const [count, setCount] = useState(0);

  async function getCount() {
    const url = "http://localhost:3000/api/count";
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }

      const data = await response.json();
      setCount(data.count);
      console.log(data);
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
      console.log(data);
    } catch (error) {
      let message;
      if (error instanceof Error) message = error.message;
      else message = String(error);
      console.error(message);
    }
  }

  useEffect(() => {
    getCount();
  }, []);

  return (
    <main>
      <Board />
    </main>
  );
}

export default App;
