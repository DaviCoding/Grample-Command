import { randomUUID } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { getRequestIp, getUserAgent } from "@shared/http/request-context.js";
import { AuditLogRepository } from "./audit-log.repository.js";
import type { AuditStatus } from "./audit-event.entity.js";

type AuditInput = {
  actor?: string;
  action: string;
  targetType: string;
  targetId?: string;
  status: AuditStatus;
  metadata?: Record<string, unknown>;
};

export class AuditService {
  private readonly repository = new AuditLogRepository();

  async record(request: FastifyRequest, input: AuditInput) {
    const event = {
      id: randomUUID(),
      actor: input.actor ?? request.currentUser?.username ?? "anonymous",
      action: input.action,
      targetType: input.targetType,
      status: input.status,
      ip: getRequestIp(request),
      userAgent: getUserAgent(request),
      createdAt: new Date().toISOString()
    };

    await this.repository.append({
      ...event,
      ...(input.targetId ? { targetId: input.targetId } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {})
    });
  }
}
