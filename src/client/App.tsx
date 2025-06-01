import React, { useEffect, useState, useCallback } from "react";
import type { SocketData, StoredState } from "src/shared/events";
import Game2048 from "./components/game-2048";
import { inferGameStateByBoard } from "./lib/util";
import {
  createGames,
  loadGames,
  readGame,
  updateGame,
} from "./socket-io/event-emitters";
import { socket } from "./socket-io/socket";
import styles from "./styles/index.module.css";
import type { GameState } from "./types/game";

function App() {
  const [gameStates, setGameStates] = useState<GameState[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchGames = async () => {
      console.log("Fetching games...");
      setIsLoading(true);
      try {
        const response = await loadGames();

        if ("error" in response) {
          console.error("Failed loading games:", response.error);
          setGameStates([]);
        } else {
          console.log("Loaded games: ", response);
          const inferredGameStates = response.data.map((board) =>
            inferGameStateByBoard(board),
          );
          setGameStates(inferredGameStates);
        }
      } catch (error) {
        console.error("Exception while fetching games:", error);
        setGameStates([]);
      } finally {
        setIsLoading(false);
      }
    };

    const handleConnect = () => {
      console.log("Connected to server");
      fetchGames();
    };

    const handleDisconnect = (reason: string) => {
      console.warn("Socket disconnected:", reason);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("game:updated", handleServerUpdate);

    if (socket.connected) {
      fetchGames();
    } else {
      socket.connect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);

      socket.off("game:updated", handleServerUpdate);
    };
  }, []);

  const handleServerUpdate = useCallback(
    (
      payload: SocketData,
      ackCallback: (error: string | null, success: boolean) => void,
    ) => {
      console.log("Server update received:", payload);

      setGameStates((prevGameStates) => {
        const newGameStates = prevGameStates.map((gs) =>
          gs.id === payload.id ? inferGameStateByBoard(payload) : gs,
        );
        return newGameStates;
      });

      ackCallback(null, true);
    },
    [],
  );

  const handleLocalStateChange = useCallback(async (gameState: GameState) => {
    console.log("Current State: ", gameState);
    const result = await updateGame(gameState);
    if (!result.success) {
      console.error("Failed updating game state on server");
    }
  }, []);

  const createInitialBoard = useCallback((): StoredState => {
    return [
      [null, null, null, 2],
      [null, null, null, null],
      [null, null, null, null],
      [2, null, null, null],
    ];
  }, []);

const handleCreateGames = useCallback(
  async (count: number) => {
    const newBoards: StoredState[] = Array.from(
      { length: count },
      () => createInitialBoard()
    );

    const result = await createGames(newBoards);
    console.log(`${count} games creation request sent.`);

    const responses = await Promise.all(
      result.gameIDs.map((id) => readGame(id))
    );

    const incomingStates: GameState[] = [];
    for (const res of responses) {
      if ("error" in res) {
        console.error("failed readGame:", res.error);
        continue;
      }
      incomingStates.push(inferGameStateByBoard(res.data));
    }

    if (incomingStates.length === 0) {
      console.warn("no new games to append");
      return;
    }

    setGameStates((prev) => [...prev, ...incomingStates]);
  },
  [createInitialBoard]
);

  return (
    <div className={styles.twenty48}>
      <header>
        <h1>OM2048</h1>
        <button type="button" onClick={() => handleCreateGames(1)}>
          CREATE 1 GAME
        </button>
      </header>
      <main>
        {isLoading ? (
          <p>Loading games...</p>
        ) : gameStates.length === 0 ? (
          <p>No games found. Create some!</p>
        ) : (
          gameStates.map((gameState) => (
            <Game2048
              key={gameState.id}
              id={gameState.id}
              active={gameState.id === selected}
              initialGameState={gameState}
              onClick={() => setSelected(gameState.id)}
              handleGameStateChange={handleLocalStateChange}
            />
          ))
        )}
      </main>
    </div>
  );
}

export default App;
