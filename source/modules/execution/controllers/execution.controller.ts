import type { FastifyReply, FastifyRequest } from "fastify";
import { AuditService } from "@infra/audit/audit.service.js";
import { AuthService } from "@modules/auth/services/auth.service.js";
import { HttpError } from "@shared/errors/http-error.js";
import { ExecutionService } from "../services/execution.service.js";
import type { ExecutionAction } from "../dto/execution.dto.js";

type ProjectParams = {
  projectId: string;
};

type LogsQuery = {
  tail?: string;
};

export class ExecutionController {
  private readonly service = new ExecutionService();
  private readonly audit = new AuditService();
  private readonly auth = new AuthService();

  async index(request: FastifyRequest, reply: FastifyReply) {
    const projects = await this.service.listStatuses();

    return reply.view("pages/execution/index", {
      title: "Execução",
      csrfToken: request.currentSession?.csrfToken,
      currentUser: request.currentUser,
      projects
    });
  }

  async status(request: FastifyRequest, reply: FastifyReply) {
    const { projectId } = request.params as ProjectParams;
    const status = await this.service.getStatus(projectId);

    return reply.send(status);
  }

  async logs(request: FastifyRequest, reply: FastifyReply) {
    const { projectId } = request.params as ProjectParams;
    const { tail } = request.query as LogsQuery;
    const result = await this.service.getLogs(projectId, tail ? Number(tail) : undefined);

    return reply.send(result);
  }

  async start(request: FastifyRequest, reply: FastifyReply) {
    return this.runAction(request, reply, "start");
  }

  async stop(request: FastifyRequest, reply: FastifyReply) {
    return this.runAction(request, reply, "stop");
  }

  async restart(request: FastifyRequest, reply: FastifyReply) {
    return this.runAction(request, reply, "restart");
  }

  async rebuild(request: FastifyRequest, reply: FastifyReply) {
    return this.runAction(request, reply, "rebuild");
  }

  async down(request: FastifyRequest, reply: FastifyReply) {
    return this.runAction(request, reply, "down");
  }

  private async runAction(request: FastifyRequest, reply: FastifyReply, action: ExecutionAction) {
    const { projectId } = request.params as ProjectParams;

    try {
      this.validateImpactPassword(request);
      const result = await this.service.runAction(projectId, action);
      await this.audit.record(request, {
        action: `execution.${action}`,
        targetType: "project",
        targetId: projectId,
        status: "success"
      });

      return reply.send(result);
    } catch (error) {
      await this.audit.record(request, {
        action: `execution.${action}`,
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
