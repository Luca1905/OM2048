import type { Server as HttpServer } from "node:http";
import type { ServerOptions } from "socket.io";
import { Server } from "socket.io";
import type { ClientEvents, ServerEvents } from "../shared/events";
import createOM2048Handlers from "./om2048-handlers";

export function createApplication(
  httpServer: HttpServer,
  serverOptions: Partial<ServerOptions> = {},
): Server<ClientEvents, ServerEvents> {
  const io = new Server<ClientEvents, ServerEvents>(httpServer, serverOptions);

  const { readGame, listGames, updateGame, createGames } =
    createOM2048Handlers();

  io.on("connection", (socket) => {
    socket.on("game:read", readGame);
    socket.on("game:update", updateGame);
    socket.on("games:list", listGames);
    socket.on("games:create", createGames);
  });

  return io;
}
