import type { FastifyReply, FastifyRequest } from "fastify";
import { AuditService } from "@infra/audit/audit.service.js";
import { AuthService } from "@modules/auth/services/auth.service.js";
import { HttpError } from "@shared/errors/http-error.js";
import { ProjectsService } from "../services/projects.service.js";

type ProjectParams = {
  projectId: string;
};

export class ProjectsController {
  private readonly service = new ProjectsService();
  private readonly audit = new AuditService();
  private readonly auth = new AuthService();

  async index(request: FastifyRequest, reply: FastifyReply) {
    const projects = await this.service.listOverview();

    return reply.view("pages/projects/index", {
      title: "Projetos",
      csrfToken: request.currentSession?.csrfToken,
      currentUser: request.currentUser,
      projects
    });
  }

  async initialize(request: FastifyRequest, reply: FastifyReply) {
    const { projectId } = request.params as ProjectParams;
    try {
      this.validateImpactPassword(request);
      const result = await this.service.initialize(projectId);
      await this.audit.record(request, {
        action: "project.initialize",
        targetType: "project",
        targetId: projectId,
        status: "success"
      });

      return reply.send(result);
    } catch (error) {
      await this.audit.record(request, {
        action: "project.initialize",
        targetType: "project",
        targetId: projectId,
        status: "failure",
        metadata: { message: error instanceof Error ? error.message : "unknown" }
      });

      throw error;
    }
  }

  async initializeAll(request: FastifyRequest, reply: FastifyReply) {
    try {
      this.validateImpactPassword(request);
      const results = await this.service.initializeAll();
      await this.audit.record(request, {
        action: "project.initialize_all",
        targetType: "project",
        status: "success"
      });

      return reply.send({ results });
    } catch (error) {
      await this.audit.record(request, {
        action: "project.initialize_all",
        targetType: "project",
        status: "failure",
        metadata: { message: error instanceof Error ? error.message : "unknown" }
      });

      throw error;
    }
  }

  async createEnv(request: FastifyRequest, reply: FastifyReply) {
    const { projectId } = request.params as ProjectParams;

    try {
      this.validateImpactPassword(request);

      const body = request.body as { content?: unknown } | undefined;
      const content = typeof body?.content === "string" ? body.content : "";

      if (!content.trim()) {
        throw new HttpError(400, "ENV_CONTENT_REQUIRED", "Informe o conteÃºdo do .env.");
      }

      const result = await this.service.createEnv(projectId, content);

      await this.audit.record(request, {
        action: "project.env.create",
        targetType: "project",
        targetId: projectId,
        status: "success"
      });

      return reply.send(result);
    } catch (error) {
      await this.audit.record(request, {
        action: "project.env.create",
        targetType: "project",
        targetId: projectId,
        status: "failure",
        metadata: { message: error instanceof Error ? error.message : "unknown" }
      });

      throw error;
    }
  }

  private validateImpactPassword(request: FastifyRequest) {
    const body = request.body as { password?: unknown } | undefined;
    const password = typeof body?.password === "string" ? body.password : "";

    if (!this.auth.verifyAdminPassword(password)) {
      throw new HttpError(403, "INVALID_CONFIRMATION_PASSWORD", "Senha de confirmação inválida.");
    }
  }
}
