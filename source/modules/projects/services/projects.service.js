import path from "node:path";
import { mkdir } from "node:fs/promises";
import { env } from "@config/env.js";
import { GitService } from "@infra/git/git.service.js";
import { pathExists } from "@shared/fs/path-exists.js";
import { ProjectsRepository } from "../repositories/projects.repository.js";
export class ProjectsService {
    repository = new ProjectsRepository();
    git = new GitService();
    resolvePath(project) {
        return path.join(env.PROJECTS_BASE_PATH, project.directory);
    }
    async list() {
        const projects = await this.repository.list();
        return Promise.all(projects.map(async (project) => {
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
            }
            catch (error) {
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
        }));
    }
    async initialize(projectId) {
        const project = await this.repository.findById(projectId);
        if (!project) {
            throw new Error("Project not found");
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
            }
            catch (error) {
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
}
