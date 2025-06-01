import { type Socket, io } from "socket.io-client";
import type { ClientEvents, ServerEvents } from "src/shared/events";

const URL = import.meta.env.VITE_BACKEND_URL;

console.log(URL);
export const socket: Socket<ServerEvents, ClientEvents> = io(URL);
