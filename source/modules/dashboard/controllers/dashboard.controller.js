import { DeploymentsService } from "@modules/deployments/services/deployments.service.js";
import { ProjectsService } from "@modules/projects/services/projects.service.js";
export class DashboardController {
    projects = new ProjectsService();
    deployments = new DeploymentsService();
    async index(_request, reply) {
        const [projects, deployments] = await Promise.all([
            this.projects.list(),
            this.deployments.list()
        ]);
        return reply.view("pages/dashboard/index", {
            title: "Dashboard",
            csrfToken: _request.currentSession?.csrfToken,
            currentUser: _request.currentUser,
            projects,
            deployments: deployments.slice(0, 5)
        });
    }
}
