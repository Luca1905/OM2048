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

  const handleServerUpdate = useCallback((payload: SocketData) => {
    console.log("Server update received:", payload);

    setGameStates((prevGameStates) => {
      const existingIndex = prevGameStates.findIndex(
        (gs) => gs.id === payload.id,
      );
      const updatedGameState = inferGameStateByBoard(payload);

      if (existingIndex === -1) {
        // New game appeared via websocket update
        return [updatedGameState, ...prevGameStates];
      }

      const next = [...prevGameStates];
      next[existingIndex] = updatedGameState;
      return next;
    });
  }, []);

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
      console.log("Connected to server via websocket");
      fetchGames();
    };

    const handleDisconnect = (reason: string) => {
      console.warn("Socket disconnected:", reason);
    };

    const handleConnectError = (error: Error) => {
      console.error("Socket connection error:", error);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("game:updated", handleServerUpdate);

    if (!socket.connected) {
      socket.connect();
    } else {
      fetchGames();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("game:updated", handleServerUpdate);
    };
  }, [handleServerUpdate]);

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
      const newBoards: StoredState[] = Array.from({ length: count }, () =>
        createInitialBoard(),
      );

      const result = await createGames(newBoards);
      console.log(`${count} games creation request sent.`);

      const responses = await Promise.all(
        result.gameIDs.map((id) => readGame(id)),
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

      setGameStates((prev) => [...incomingStates, ...prev]);
    },
    [createInitialBoard],
  );

  return (
    <div className={styles.twenty48}>
      <header>
        <h1>OM2048</h1>
        <a href="https://github.com/Luca1905/OM2048">PLS star</a>
          <button type="button" onClick={() => handleCreateGames(10_000)}>
            CREATE 1 BOARD
          </button>
        <div style={{ gap: 16 ,display: "flex", flexDirection: "row" }}>
          <p>Won Games: {gameStates.filter((game) => game.status === "won").length}</p>
          <p>Total Games: {gameStates.length}</p>
          <p>Ongoing Games: {gameStates.filter((game) => game.status === "ongoing").length}</p>
        </div>
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
