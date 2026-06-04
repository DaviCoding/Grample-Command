import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { env } from "@config/env.js";
import { GitService } from "@infra/git/git.service.js";
import { HttpError } from "@shared/errors/http-error.js";
import { pathExists } from "@shared/fs/path-exists.js";
import { ProjectsRepository } from "../repositories/projects.repository.js";
import type { Project } from "../entities/project.entity.js";

export class ProjectsService {
  private readonly repository = new ProjectsRepository();
  private readonly git = new GitService();

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

        return {
          ...project,
          path: projectPath,
          exists,
          envExists,
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
    const project = await this.repository.findById(projectId);

    if (!project) {
      throw new HttpError(404, "PROJECT_NOT_FOUND", "Projeto nÃ£o encontrado.");
    }

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

    return {
      status: "initialized",
      projectId: project.id,
      path: projectPath,
      logs: [`$ ${result.command}`, result.stdout, result.stderr].filter(Boolean)
    };
  }

  async initializeAll() {
    const projects = await this.repository.list();
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
    const project = await this.repository.findById(projectId);

    if (!project) {
      throw new Error("Project not found");
    }

    const projectPath = this.resolvePath(project);

    if (!(await pathExists(projectPath))) {
      throw new HttpError(409, "PROJECT_NOT_INITIALIZED", "Inicialize o projeto antes de criar o .env.");
    }

    if (content.length > 100_000) {
      throw new HttpError(413, "ENV_CONTENT_TOO_LARGE", "O conteÃºdo do .env Ã© muito grande.");
    }

    const envPath = path.join(projectPath, ".env");

    if (await pathExists(envPath)) {
      throw new HttpError(409, "ENV_ALREADY_EXISTS", "O .env jÃ¡ existe e nÃ£o pode ser recriado pelo Command.");
    }

    const normalizedContent = content.replace(/\r\n/g, "\n");

    try {
      await writeFile(envPath, normalizedContent.endsWith("\n") ? normalizedContent : `${normalizedContent}\n`, {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600
      });
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;

      if (nodeError.code === "EEXIST") {
        throw new HttpError(409, "ENV_ALREADY_EXISTS", "O .env jÃ¡ existe e nÃ£o pode ser recriado pelo Command.");
      }

      throw error;
    }

    return {
      status: "created",
      projectId: project.id,
      path: envPath
    };
  }
}
