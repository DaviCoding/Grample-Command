import { randomUUID } from "node:crypto";
import { DockerComposeService } from "@infra/docker/docker-compose.service.js";
import { GitService } from "@infra/git/git.service.js";
import { HealthcheckService } from "@infra/http/healthcheck.service.js";
import { PostgresBackupService } from "@infra/backup/postgres-backup.service.js";
import { ProjectsRepository } from "@modules/projects/repositories/projects.repository.js";
import { ProjectsService } from "@modules/projects/services/projects.service.js";
import { DeploymentsRepository } from "../repositories/deployments.repository.js";
import type { Deployment } from "../entities/deployment.entity.js";

function nowIso() {
  return new Date().toISOString();
}

export class DeploymentsService {
  private readonly projectsRepository = new ProjectsRepository();
  private readonly projectsService = new ProjectsService();
  private readonly deployments = new DeploymentsRepository();
  private readonly git = new GitService();
  private readonly docker = new DockerComposeService();
  private readonly backup = new PostgresBackupService();
  private readonly healthcheck = new HealthcheckService();

  async list() {
    return this.deployments.list();
  }

  async checkProject(projectId: string) {
    const project = await this.projectsRepository.findById(projectId);

    if (!project) {
      throw new Error("Project not found");
    }

    const projectPath = this.projectsService.resolvePath(project);
    const status = await this.git.check(projectPath, project.branch);

    return {
      projectId: project.id,
      projectName: project.name,
      currentCommit: status.currentCommit,
      remoteCommit: status.remoteCommit,
      currentShort: status.currentCommit.slice(0, 7),
      remoteShort: status.remoteCommit.slice(0, 7),
      behind: status.behind,
      updateAvailable: status.updateAvailable,
      logs: status.logs
    };
  }

  async deployProject(projectId: string) {
    const project = await this.projectsRepository.findById(projectId);

    if (!project) {
      throw new Error("Project not found");
    }

    const projectPath = this.projectsService.resolvePath(project);
    const logs: string[] = [];
    const deployment: Deployment = {
      id: `dep_${randomUUID()}`,
      projectId: project.id,
      projectName: project.name,
      status: "running",
      logs,
      startedAt: nowIso()
    };

    await this.deployments.append(deployment);

    try {
      const gitStatus = await this.git.check(projectPath, project.branch);
      logs.push(...gitStatus.logs);

      const patch = {
        fromCommit: gitStatus.currentCommit,
        toCommit: gitStatus.remoteCommit,
        behind: gitStatus.behind
      };

      if (!gitStatus.updateAvailable) {
        logs.push("No update available. Deploy skipped.");

        return this.deployments.update(deployment.id, {
          ...patch,
          status: "skipped",
          logs,
          finishedAt: nowIso()
        });
      }

      const backup = await this.backup.dump(project.id, project.databaseUrlEnv);
      logs.push(backup.log);

      const pull = await this.git.pull(projectPath, project.branch);
      logs.push([`$ ${pull.command}`, pull.stdout, pull.stderr].filter(Boolean).join("\\n"));

      if (pull.exitCode !== 0) {
        throw new Error(pull.stderr || "git pull failed");
      }

      const compose = await this.docker.up(projectPath, project.composeFile);
      logs.push([`$ ${compose.command}`, compose.stdout, compose.stderr].filter(Boolean).join("\\n"));

      if (compose.exitCode !== 0) {
        throw new Error(compose.stderr || "docker compose failed");
      }

      const healthcheck = await this.healthcheck.check(project.healthcheckUrl);
      logs.push(`healthcheck: ${healthcheck.message}`);

      if (!healthcheck.ok) {
        throw new Error(healthcheck.message);
      }

      return this.deployments.update(deployment.id, {
        ...patch,
        status: "success",
        backupFile: backup.filePath ?? null,
        logs,
        finishedAt: nowIso()
      });
    } catch (error) {
      logs.push(`ERROR: ${error instanceof Error ? error.message : "Unknown error"}`);

      return this.deployments.update(deployment.id, {
        status: "failed",
        logs,
        finishedAt: nowIso()
      });
    }
  }
}
