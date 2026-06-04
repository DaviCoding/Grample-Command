import { DockerComposeService } from "@infra/docker/docker-compose.service.js";
import { ProjectsRepository } from "@modules/projects/repositories/projects.repository.js";
import { ProjectsService } from "@modules/projects/services/projects.service.js";
import { pathExists } from "@shared/fs/path-exists.js";
import type { Project } from "@modules/projects/entities/project.entity.js";
import type { ContainerStatus, ExecutionAction, ProjectExecutionStatus } from "../dto/execution.dto.js";

type RawComposeContainer = {
  ID?: string;
  Name?: string;
  Names?: string;
  Service?: string;
  Image?: string;
  State?: string;
  Health?: string;
  Status?: string;
  Ports?: string;
  Publishers?: unknown;
};

export class ExecutionService {
  private readonly projectsRepository = new ProjectsRepository();
  private readonly projectsService = new ProjectsService();
  private readonly docker = new DockerComposeService();

  async listStatuses() {
    const projects = await this.projectsRepository.list();
    return Promise.all(projects.map((project) => this.getStatus(project.id)));
  }

  async getStatus(projectId: string): Promise<ProjectExecutionStatus> {
    const project = await this.getProject(projectId);
    const projectPath = this.projectsService.resolvePath(project);
    const exists = await pathExists(projectPath);

    if (!exists) {
      return {
        projectId: project.id,
        projectName: project.name,
        path: projectPath,
        composeFile: project.composeFile,
        exists: false,
        healthy: false,
        state: "not_initialized",
        containers: [],
        logs: []
      };
    }

    const result = await this.docker.ps(projectPath, project.composeFile);
    const logs = [`$ ${result.command}`, result.stdout, result.stderr].filter(Boolean);

    if (result.exitCode !== 0) {
      return {
        projectId: project.id,
        projectName: project.name,
        path: projectPath,
        composeFile: project.composeFile,
        exists: true,
        healthy: false,
        state: "error",
        containers: [],
        logs,
        error: result.stderr || "docker compose ps failed"
      };
    }

    const containers = this.parseContainers(result.stdout);
    const state = this.resolveProjectState(containers);

    return {
      projectId: project.id,
      projectName: project.name,
      path: projectPath,
      composeFile: project.composeFile,
      exists: true,
      healthy: state === "online",
      state,
      containers,
      logs
    };
  }

  async runAction(projectId: string, action: ExecutionAction) {
    const project = await this.getProject(projectId);
    const projectPath = this.projectsService.resolvePath(project);

    if (!await pathExists(projectPath)) {
      throw new Error("Project is not initialized");
    }

    const result = await this.execute(project, projectPath, action);

    if (result.exitCode !== 0) {
      throw new Error(result.stderr || `${action} failed`);
    }

    return {
      projectId: project.id,
      projectName: project.name,
      action,
      status: "success",
      logs: [`$ ${result.command}`, result.stdout, result.stderr].filter(Boolean),
      runtime: await this.getStatus(project.id)
    };
  }

  async getLogs(projectId: string, tail = 200) {
    const project = await this.getProject(projectId);
    const projectPath = this.projectsService.resolvePath(project);

    if (!await pathExists(projectPath)) {
      throw new Error("Project is not initialized");
    }

    const safeTail = Math.min(Math.max(tail, 20), 1000);
    const result = await this.docker.logs(projectPath, project.composeFile, safeTail);

    if (result.exitCode !== 0) {
      throw new Error(result.stderr || "docker compose logs failed");
    }

    return {
      projectId: project.id,
      projectName: project.name,
      tail: safeTail,
      logs: [`$ ${result.command}`, result.stdout, result.stderr].filter(Boolean)
    };
  }

  private async getProject(projectId: string) {
    const project = await this.projectsRepository.findById(projectId);

    if (!project) {
      throw new Error("Project not found");
    }

    return project;
  }

  private execute(project: Project, projectPath: string, action: ExecutionAction) {
    if (action === "start") return this.docker.start(projectPath, project.composeFile);
    if (action === "stop") return this.docker.stop(projectPath, project.composeFile);
    if (action === "restart") return this.docker.restart(projectPath, project.composeFile);
    if (action === "rebuild") return this.docker.rebuild(projectPath, project.composeFile);

    return this.docker.down(projectPath, project.composeFile);
  }

  private parseContainers(stdout: string): ContainerStatus[] {
    if (!stdout.trim()) return [];

    try {
      const containers = this.parseComposeJson(stdout);

      return containers.map((container) => {
        const ports = this.stringifyPorts(container.Publishers);
        const state = container.State ?? "unknown";
        const name = container.Name ?? container.Names ?? "-";

        return {
          name,
          service: container.Service ?? "-",
          state,
          ...(container.ID ? { id: container.ID } : {}),
          ...(container.Image ? { image: container.Image } : {}),
          ...(container.Health ? { health: container.Health } : {}),
          ...(container.Status ? { status: container.Status } : {}),
          ...(ports || container.Ports ? { ports: ports ?? container.Ports } : {})
        };
      });
    } catch {
      return [];
    }
  }

  private parseComposeJson(stdout: string): RawComposeContainer[] {
    const trimmed = stdout.trim();

    if (trimmed.startsWith("[")) {
      const parsed = JSON.parse(trimmed) as RawComposeContainer[];
      return Array.isArray(parsed) ? parsed : [];
    }

    return trimmed
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as RawComposeContainer);
  }

  private resolveProjectState(containers: ContainerStatus[]): ProjectExecutionStatus["state"] {
    if (containers.length === 0) return "offline";

    const running = containers.filter((container) => container.state.toLowerCase() === "running");

    if (running.length === containers.length) return "online";
    if (running.length === 0) return "offline";

    return "partial";
  }

  private stringifyPorts(value: unknown) {
    if (!value) return undefined;
    if (typeof value === "string") return value;

    return JSON.stringify(value);
  }
}
