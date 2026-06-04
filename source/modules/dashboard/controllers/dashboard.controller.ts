import type { FastifyReply, FastifyRequest } from "fastify";
import { SystemMonitorService } from "@infra/monitoring/system-monitor.service.js";
import { DeploymentsService } from "@modules/deployments/services/deployments.service.js";
import { ProjectsService } from "@modules/projects/services/projects.service.js";

export class DashboardController {
  private readonly projects = new ProjectsService();
  private readonly deployments = new DeploymentsService();
  private readonly monitor = new SystemMonitorService();

  async index(_request: FastifyRequest, reply: FastifyReply) {
    const [projects, deployments, metrics] = await Promise.all([
      this.projects.listOverview(),
      this.deployments.list(),
      this.monitor.getDashboard()
    ]);

    return reply.view("pages/dashboard/index", {
      title: "Dashboard",
      csrfToken: _request.currentSession?.csrfToken,
      currentUser: _request.currentUser,
      projects,
      deployments: deployments.slice(0, 5),
      metrics
    });
  }
}
