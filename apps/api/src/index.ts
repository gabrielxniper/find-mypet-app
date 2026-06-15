import type { IncomingMessage, ServerResponse } from "http";
import { buildServer } from "./app";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;

async function getServer(): Promise<FastifyInstance> {
  if (!app) {
    app = await buildServer();
    await app.ready();
  }
  return app;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  const server = await getServer();
  server.server.emit("request", req, res);
}
