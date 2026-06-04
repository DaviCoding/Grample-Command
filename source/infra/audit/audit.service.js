import { randomUUID } from "node:crypto";
import { getRequestIp, getUserAgent } from "@shared/http/request-context.js";
import { AuditLogRepository } from "./audit-log.repository.js";
export class AuditService {
    repository = new AuditLogRepository();
    async record(request, input) {
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
