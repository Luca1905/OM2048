import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import GameProvider from "./2048/game-context";
import App from "./App";
import "./globals.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error(
    "Failed to find the root element with ID 'root'. React application cannot start.",
  );
}
const root = createRoot(rootElement);
root.render(
  <StrictMode>
    <GameProvider>
      <App />
    </GameProvider>
  </StrictMode>,
);
