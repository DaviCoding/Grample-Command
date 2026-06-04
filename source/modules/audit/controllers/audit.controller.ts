import type { FastifyReply, FastifyRequest } from "fastify";
import { AuditLogRepository } from "@infra/audit/audit-log.repository.js";

export class AuditController {
  private readonly repository = new AuditLogRepository();

  async index(request: FastifyRequest, reply: FastifyReply) {
    const events = await this.repository.list();

    return reply.view("pages/audit/index", {
      title: "Auditoria",
      csrfToken: request.currentSession?.csrfToken,
      currentUser: request.currentUser,
      events: events.slice(0, 200)
    });
  }
}
