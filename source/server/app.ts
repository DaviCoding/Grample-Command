import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import fastifyFormbody from "@fastify/formbody";
import fastifyStatic from "@fastify/static";
import fastifyView from "@fastify/view";
import ejs from "ejs";
import { registerRoutes } from "./routes.js";
import { ProjectsService } from "@modules/projects/services/projects.service.js";
import { securityPlugin } from "./plugins/security.plugin.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(dirname, "..");

export async function buildApp() {
  const app = Fastify({
    logger: true
  });

  await app.register(fastifyFormbody);

  await app.register(fastifyStatic, {
    root: path.join(sourceRoot, "public"),
    prefix: "/public/"
  });

  await app.register(fastifyView, {
    engine: { ejs },
    root: path.join(sourceRoot, "views"),
    viewExt: "ejs",
    includeViewExtension: true
  });

  await securityPlugin(app);

  app.setErrorHandler((error, _request, reply) => {
    const candidate = error as { statusCode?: unknown; message?: unknown };
    const statusCode = typeof candidate.statusCode === "number" ? candidate.statusCode : 500;
    const message = typeof candidate.message === "string" ? candidate.message : "Erro interno.";

    return reply.status(statusCode).send({
      message,
      statusCode
    });
  });

  await registerRoutes(app);

  try {
    const projectsService = new ProjectsService();
    const results = await projectsService.initializeAll();
    const initialized = results.filter(r => !r.skipped && r.status === "initialized");
    const failed = results.filter(r => r.status === "error");

    if (initialized.length > 0) {
      app.log.info({ initialized: initialized.map(r => r.projectId) }, "Auto-initialized missing projects");
    }
    if (failed.length > 0) {
      app.log.warn({ failed: failed.map(r => ({ id: r.projectId, error: (r as any).error })) }, "Some projects failed to auto-initialize");
    }
  } catch (err) {
    app.log.warn({ err }, "Auto-initialization check failed (non-fatal)");
  }

  return app;
}
