import { useEffect, useState } from "react";
import { om2048Store } from "../io/om2048-store";
import type { GameState } from "../types/game";

export function useOM2048Store() {
  const [gameStates, setGameStates] = useState<GameState[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = om2048Store.subscribe(() => {
      setGameStates([...om2048Store.gameStates]);
      setLoading(false);
    });

    if (om2048Store.gameStates.length > 0) {
      setGameStates([...om2048Store.gameStates]);
      setLoading(false);
    }

    return unsubscribe;
  }, []);

  return {
    gameStates,
    loading,
    updateGame: om2048Store.updateGame.bind(om2048Store),
    createGames: om2048Store.createGames.bind(om2048Store),
    getWon: om2048Store.getWon.bind(om2048Store),
    getLost: om2048Store.getLost.bind(om2048Store),
    getOngoing: om2048Store.getOngoing.bind(om2048Store),
  };
}
