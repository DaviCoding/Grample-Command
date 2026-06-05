import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { env } from "@config/env.js";
import { DockerComposeService } from "@infra/docker/docker-compose.service.js";
import { GitService } from "@infra/git/git.service.js";
import { HealthcheckService } from "@infra/http/healthcheck.service.js";
import { HttpError } from "@shared/errors/http-error.js";
import { pathExists } from "@shared/fs/path-exists.js";
import { defaultProjects } from "../default-projects.js";
import { ProjectEnvRepository } from "../repositories/project-env.repository.js";
import { ProjectsRepository } from "../repositories/projects.repository.js";
import type { Project } from "../entities/project.entity.js";

export class ProjectsService {
  private readonly repository = new ProjectsRepository();
  private readonly projectEnvs = new ProjectEnvRepository();
  private readonly git = new GitService();
  private readonly docker = new DockerComposeService();
  private readonly healthcheck = new HealthcheckService();

  resolvePath(project: Project) {
    return path.join(env.PROJECTS_BASE_PATH, project.directory);
  }

  async list() {
    const projects = await this.repository.list();

    return Promise.all(
      projects.map(async (project) => {
        const projectPath = this.resolvePath(project);
        const exists = await pathExists(projectPath);

        if (!exists) {
          return {
            ...project,
            path: projectPath,
            exists: false,
            status: "not_initialized",
            currentCommit: "-",
            remoteCommit: "-",
            behind: 0,
            updateAvailable: false,
            error: null
          };
        }

        try {
          const status = await this.git.check(projectPath, project.branch);

          return {
            ...project,
            path: projectPath,
            exists: true,
            status: status.updateAvailable ? "pending" : "synced",
            currentCommit: status.currentCommit.slice(0, 7),
            remoteCommit: status.remoteCommit.slice(0, 7),
            behind: status.behind,
            updateAvailable: status.updateAvailable,
            error: null
          };
        } catch (error) {
          return {
            ...project,
            path: projectPath,
            exists: true,
            status: "error",
            currentCommit: "-",
            remoteCommit: "-",
            behind: 0,
            updateAvailable: false,
            error: error instanceof Error ? error.message : "Unknown error"
          };
        }
      })
    );
  }

  async listOverview() {
    const projects = await this.repository.list();

    return Promise.all(
      projects.map(async (project) => {
        const projectPath = this.resolvePath(project);
        const exists = await pathExists(projectPath);
        const envExists = exists ? await pathExists(path.join(projectPath, ".env")) : false;
        const storedEnvExists = await this.projectEnvs.exists(project.id);

        return {
          ...project,
          path: projectPath,
          exists,
          envExists,
          storedEnvExists,
          status: exists ? "initialized" : "not_initialized",
          currentCommit: "-",
          remoteCommit: "-",
          behind: 0,
          updateAvailable: false,
          error: null
        };
      })
    );
  }

  async initialize(projectId: string) {
    const project = await this.getProject(projectId);
    const projectPath = this.resolvePath(project);

    if (await pathExists(projectPath)) {
      throw new Error("Project already exists");
    }

    await mkdir(path.dirname(projectPath), { recursive: true });

    const result = await this.git.clone(project.repository, project.branch, projectPath);

    if (result.exitCode !== 0) {
      throw new Error([
        "git clone failed",
        `Command: ${result.command}`,
        `ExitCode: ${result.exitCode ?? "unknown"}`,
        result.stdout ? `STDOUT:\n${result.stdout}` : "",
        result.stderr ? `STDERR:\n${result.stderr}` : ""
      ].filter(Boolean).join("\n"));
    }

    const envResult = await this.applyStoredEnv(project);

    return {
      status: "initialized",
      projectId: project.id,
      path: projectPath,
      env: envResult,
      logs: [`$ ${result.command}`, result.stdout, result.stderr, envResult.message].filter(Boolean)
    };
  }

  async initializeAll() {
    const projects = await this.orderedProjects();
    const results = [];

    for (const project of projects) {
      const projectPath = this.resolvePath(project);
      const exists = await pathExists(projectPath);

      if (exists) {
        results.push({ projectId: project.id, status: "already_exists", skipped: true });
        continue;
      }

      try {
        const result = await this.initialize(project.id);
        results.push({ projectId: project.id, status: result.status, skipped: false, logs: result.logs });
      } catch (error) {
        results.push({
          projectId: project.id,
          status: "error",
          skipped: false,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    return results;
  }

  async createEnv(projectId: string, content: string) {
    const project = await this.getProject(projectId);

    if (content.length > 100_000) {
      throw new HttpError(413, "ENV_CONTENT_TOO_LARGE", "O conteudo do .env e muito grande.");
    }

    if (await this.projectEnvs.exists(project.id)) {
      throw new HttpError(409, "ENV_ALREADY_EXISTS", "O .env ja existe no vault do Command.");
    }

    const projectPath = this.resolvePath(project);
    const projectExists = await pathExists(projectPath);

    try {
      await this.projectEnvs.writeOnce(project.id, content);

      if (projectExists && !(await pathExists(path.join(projectPath, ".env")))) {
        await this.writeProjectEnv(project, content);
      }
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;

      if (nodeError.code === "EEXIST") {
        throw new HttpError(409, "ENV_ALREADY_EXISTS", "O .env ja existe e nao pode ser recriado pelo Command.");
      }

      throw error;
    }

    return {
      status: "created",
      projectId: project.id,
      storedPath: this.projectEnvs.resolve(project.id),
      appliedToProject: projectExists
    };
  }

  async adoptEnv(projectId: string) {
    const project = await this.getProject(projectId);

    if (await this.projectEnvs.exists(project.id)) {
      throw new HttpError(409, "ENV_ALREADY_EXISTS", "O .env ja existe no vault do Command.");
    }

    const projectEnvPath = path.join(this.resolvePath(project), ".env");

    if (!(await pathExists(projectEnvPath))) {
      throw new HttpError(404, "PROJECT_ENV_NOT_FOUND", "O projeto nao possui .env para adocao.");
    }

    const content = await readFile(projectEnvPath, "utf8");
    await this.projectEnvs.writeOnce(project.id, content);

    return {
      status: "adopted",
      projectId: project.id,
      storedPath: this.projectEnvs.resolve(project.id)
    };
  }

  async bootstrapGrample() {
    const logs: string[] = [];
    const results = [];

    const network = await this.docker.ensureNetwork(env.PROJECTS_NETWORK_NAME);
    logs.push(...network.logs);

    if (network.exitCode && network.exitCode !== 0) {
      throw new Error(`Could not create docker network ${env.PROJECTS_NETWORK_NAME}`);
    }

    for (const project of await this.orderedProjects()) {
      const projectPath = this.resolvePath(project);
      const stepLogs: string[] = [];

      if (!(await pathExists(projectPath))) {
        const init = await this.initialize(project.id);
        stepLogs.push(...init.logs);
      } else {
        const adopted = await this.adoptExistingEnvIfNeeded(project);
        stepLogs.push(adopted.message);

        const applied = await this.applyStoredEnv(project);
        stepLogs.push(applied.message);
      }

      const config = await this.docker.config(projectPath, project.composeFile);
      stepLogs.push([`$ ${config.command}`, config.stdout, config.stderr].filter(Boolean).join("\n"));

      if (config.exitCode !== 0) {
        throw new Error(`${project.id}: docker compose config failed\n${config.stderr}`);
      }

      const up = await this.docker.up(projectPath, project.composeFile);
      stepLogs.push([`$ ${up.command}`, up.stdout, up.stderr].filter(Boolean).join("\n"));

      if (up.exitCode !== 0) {
        throw new Error(`${project.id}: docker compose up failed\n${up.stderr}`);
      }

      const health = await this.waitForHealth(project);
      stepLogs.push(`healthcheck: ${health.message}`);

      if (!health.ok) {
        throw new Error(`${project.id}: ${health.message}`);
      }

      results.push({
        projectId: project.id,
        status: "ready",
        logs: stepLogs.filter(Boolean)
      });
      logs.push(...stepLogs.filter(Boolean));
    }

    return {
      status: "ready",
      network: env.PROJECTS_NETWORK_NAME,
      results,
      logs
    };
  }

  private async getProject(projectId: string) {
    const project = await this.repository.findById(projectId);

    if (!project) {
      throw new HttpError(404, "PROJECT_NOT_FOUND", "Projeto nao encontrado.");
    }

    return project;
  }

  private async orderedProjects() {
    const projects = (await this.repository.list()).filter((project) => project.enabled);
    const order = new Map(defaultProjects.map((project, index) => [project.id, index]));

    return projects.sort((left, right) =>
      (order.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(right.id) ?? Number.MAX_SAFE_INTEGER)
    );
  }

  private async applyStoredEnv(project: Project) {
    const projectPath = this.resolvePath(project);
    const envPath = path.join(projectPath, ".env");

    if (!(await pathExists(projectPath))) {
      return {
        applied: false,
        message: `${project.id}: project not initialized; stored .env not applied.`
      };
    }

    if (await pathExists(envPath)) {
      return {
        applied: false,
        message: `${project.id}: project .env already exists.`
      };
    }

    if (!(await this.projectEnvs.exists(project.id))) {
      throw new HttpError(409, "PROJECT_ENV_MISSING", `${project.name} nao possui .env no vault do Command.`);
    }

    const content = await this.projectEnvs.read(project.id);
    await this.writeProjectEnv(project, content);

    return {
      applied: true,
      message: `${project.id}: stored .env applied to project.`
    };
  }

  private async adoptExistingEnvIfNeeded(project: Project) {
    if (await this.projectEnvs.exists(project.id)) {
      return {
        adopted: false,
        message: `${project.id}: stored .env already exists.`
      };
    }

    const projectEnvPath = path.join(this.resolvePath(project), ".env");

    if (!(await pathExists(projectEnvPath))) {
      throw new HttpError(409, "PROJECT_ENV_MISSING", `${project.name} nao possui .env no projeto nem no vault do Command.`);
    }

    const content = await readFile(projectEnvPath, "utf8");
    await this.projectEnvs.writeOnce(project.id, content);

    return {
      adopted: true,
      message: `${project.id}: existing project .env adopted into Command vault.`
    };
  }

  private async writeProjectEnv(project: Project, content: string) {
    const normalizedContent = content.replace(/\r\n/g, "\n");

    await writeFile(path.join(this.resolvePath(project), ".env"), normalizedContent.endsWith("\n") ? normalizedContent : `${normalizedContent}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600
    });
  }

  private async waitForHealth(project: Project) {
    if (!project.healthcheckUrl) {
      return {
        skipped: true,
        ok: true,
        status: 0,
        message: "Healthcheck skipped."
      };
    }

    let last = await this.healthcheck.check(project.healthcheckUrl);

    for (let attempt = 0; attempt < 30 && !last.ok; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      last = await this.healthcheck.check(project.healthcheckUrl);
    }

    return last;
  }
}
