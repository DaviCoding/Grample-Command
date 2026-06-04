import type { FastifyInstance } from "fastify";
import { authRoutes } from "@modules/auth/auth.routes.js";
import { auditRoutes } from "@modules/audit/audit.routes.js";
import { dashboardRoutes } from "@modules/dashboard/dashboard.routes.js";
import { deploymentsRoutes } from "@modules/deployments/deployments.routes.js";
import { executionRoutes } from "@modules/execution/execution.routes.js";
import { projectsRoutes } from "@modules/projects/projects.routes.js";

export async function registerRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({
    status: "ok",
    service: "grample-command"
  }));

  await app.register(authRoutes);
  await app.register(dashboardRoutes);
  await app.register(projectsRoutes, { prefix: "/projects" });
  await app.register(deploymentsRoutes, { prefix: "/deployments" });
  await app.register(executionRoutes, { prefix: "/execution" });
  await app.register(auditRoutes, { prefix: "/audit" });
}
