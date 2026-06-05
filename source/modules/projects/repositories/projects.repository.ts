import path from "node:path";
import { fileURLToPath } from "node:url";
import { JsonFileRepository } from "@infra/json/json-file.repository.js";
import { defaultProjects } from "../default-projects.js";
import type { Project } from "../entities/project.entity.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const storagePath = path.resolve(dirname, "../../../storage/projects.json");

export class ProjectsRepository {
  private readonly repo = new JsonFileRepository<Project[]>(storagePath);

  async list() {
    let projects: Project[] = [];

    try {
      projects = await this.repo.read();
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;

      if (nodeError.code !== "ENOENT") {
        throw error;
      }
    }

    if (projects.length > 0) {
      return projects;
    }

    await this.repo.write(defaultProjects);
    return defaultProjects;
  }

  async findById(id: string) {
    const projects = await this.list();
    return projects.find((project) => project.id === id);
  }
}
