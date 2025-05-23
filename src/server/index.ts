import { createServer } from "node:http";
import { createApplication } from "./app";

const httpServer = createServer();

createApplication(httpServer, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});

httpServer.listen(3000);
