import type { FastifyInstance } from "fastify";
import { DeploymentsController } from "./controllers/deployments.controller.js";

export async function deploymentsRoutes(app: FastifyInstance) {
  const controller = new DeploymentsController();

  app.get("/", controller.index.bind(controller));
  app.post("/:projectId/check", controller.checkProject.bind(controller));
  app.post("/:projectId/deploy", controller.deployProject.bind(controller));
}
