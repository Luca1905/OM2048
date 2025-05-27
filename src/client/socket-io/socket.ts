import { type Socket, io } from "socket.io-client";
import type { ClientEvents, ServerEvents } from "src/shared/events";

const URL =
  import.meta.env.MODE === "production" ? undefined : "http://localhost:3000";

export const socket: Socket<ServerEvents, ClientEvents> = io(URL);
