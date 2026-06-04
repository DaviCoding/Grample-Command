import { AuditService } from "@infra/audit/audit.service.js";
import { ProjectsService } from "../services/projects.service.js";
export class ProjectsController {
    service = new ProjectsService();
    audit = new AuditService();
    async index(request, reply) {
        const projects = await this.service.list();
        return reply.view("pages/projects/index", {
            title: "Projetos",
            csrfToken: request.currentSession?.csrfToken,
            currentUser: request.currentUser,
            projects
        });
    }
    async initialize(request, reply) {
        const { projectId } = request.params;
        try {
            const result = await this.service.initialize(projectId);
            await this.audit.record(request, {
                action: "project.initialize",
                targetType: "project",
                targetId: projectId,
                status: "success"
            });
            return reply.send(result);
        }
        catch (error) {
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
    async initializeAll(request, reply) {
        try {
            const results = await this.service.initializeAll();
            await this.audit.record(request, {
                action: "project.initialize_all",
                targetType: "project",
                status: "success"
            });
            return reply.send({ results });
        }
        catch (error) {
            await this.audit.record(request, {
                action: "project.initialize_all",
                targetType: "project",
                status: "failure",
                metadata: { message: error instanceof Error ? error.message : "unknown" }
            });
            throw error;
        }
    }
}
