import { AuditService } from "@infra/audit/audit.service.js";
import { DeploymentsService } from "../services/deployments.service.js";
export class DeploymentsController {
    service = new DeploymentsService();
    audit = new AuditService();
    async index(request, reply) {
        const deployments = await this.service.list();
        return reply.view("pages/deployments/index", {
            title: "Deployments",
            csrfToken: request.currentSession?.csrfToken,
            currentUser: request.currentUser,
            deployments
        });
    }
    async checkProject(request, reply) {
        const { projectId } = request.params;
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
        }
        catch (error) {
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
    async deployProject(request, reply) {
        const { projectId } = request.params;
        try {
            const result = await this.service.deployProject(projectId);
            await this.audit.record(request, {
                action: "deployment.run",
                targetType: "project",
                targetId: projectId,
                status: result.status === "failed" ? "failure" : "success",
                metadata: { deploymentId: result.id, deploymentStatus: result.status }
            });
            return reply.send(result);
        }
        catch (error) {
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
}
