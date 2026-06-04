import type { FastifyInstance } from "fastify";
import { ExecutionController } from "./controllers/execution.controller.js";

export async function executionRoutes(app: FastifyInstance) {
  const controller = new ExecutionController();

  app.get("/", controller.index.bind(controller));
  app.get("/:projectId/status", controller.status.bind(controller));
  app.get("/:projectId/logs", controller.logs.bind(controller));
  app.post("/:projectId/start", controller.start.bind(controller));
  app.post("/:projectId/stop", controller.stop.bind(controller));
  app.post("/:projectId/restart", controller.restart.bind(controller));
  app.post("/:projectId/rebuild", controller.rebuild.bind(controller));
  app.post("/:projectId/down", controller.down.bind(controller));
}
