import type { FastifyInstance } from "fastify";
import { AuditController } from "./controllers/audit.controller.js";

export async function auditRoutes(app: FastifyInstance) {
  const controller = new AuditController();

  app.get("/", controller.index.bind(controller));
}
