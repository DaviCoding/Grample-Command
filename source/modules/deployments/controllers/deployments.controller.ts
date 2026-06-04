import type { FastifyReply, FastifyRequest } from "fastify";
import { AuditService } from "@infra/audit/audit.service.js";
import { AuthService } from "@modules/auth/services/auth.service.js";
import { HttpError } from "@shared/errors/http-error.js";
import { DeploymentsService } from "../services/deployments.service.js";

type ProjectParams = {
  projectId: string;
};

export class DeploymentsController {
  private readonly service = new DeploymentsService();
  private readonly audit = new AuditService();
  private readonly auth = new AuthService();

  async index(request: FastifyRequest, reply: FastifyReply) {
    const deployments = await this.service.list();

    return reply.view("pages/deployments/index", {
      title: "Deployments",
      csrfToken: request.currentSession?.csrfToken,
      currentUser: request.currentUser,
      deployments
    });
  }

  async checkProject(request: FastifyRequest, reply: FastifyReply) {
    const { projectId } = request.params as ProjectParams;
    try {
      const result = await this.service.checkProject(projectId);
      await this.audit.record(request, {
        action: "deployment.check",
        targetType: "project",
        targetId: projectId,
        status: "success",
        metadata: { updateAvailable: result.updateAvailable }
      });

      return reply.send(result);
    } catch (error) {
      await this.audit.record(request, {
        action: "deployment.check",
        targetType: "project",
        targetId: projectId,
        status: "failure",
        metadata: { message: error instanceof Error ? error.message : "unknown" }
      });

      throw error;
    }
  }

  async deployProject(request: FastifyRequest, reply: FastifyReply) {
    const { projectId } = request.params as ProjectParams;
    try {
      this.validateImpactPassword(request);
      const result = await this.service.deployProject(projectId);
      await this.audit.record(request, {
        action: "deployment.run",
        targetType: "project",
        targetId: projectId,
        status: result.status === "failed" ? "failure" : "success",
        metadata: { deploymentId: result.id, deploymentStatus: result.status }
      });

      return reply.send(result);
    } catch (error) {
      await this.audit.record(request, {
        action: "deployment.run",
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
