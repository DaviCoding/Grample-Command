import type { FastifyInstance } from "fastify";
import { ProjectsController } from "./controllers/projects.controller.js";

export async function projectsRoutes(app: FastifyInstance) {
  const controller = new ProjectsController();

  app.get("/", controller.index.bind(controller));
  app.post("/:projectId/initialize", controller.initialize.bind(controller));
  app.post("/:projectId/env", controller.createEnv.bind(controller));
  app.post("/initialize-all", controller.initializeAll.bind(controller));
}
