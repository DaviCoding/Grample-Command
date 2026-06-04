import type { FastifyInstance } from "fastify";
import { DashboardController } from "./controllers/dashboard.controller.js";

export async function dashboardRoutes(app: FastifyInstance) {
  const controller = new DashboardController();

  app.get("/", controller.index.bind(controller));
}
