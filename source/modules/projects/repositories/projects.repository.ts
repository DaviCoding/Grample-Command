import path from "node:path";
import { fileURLToPath } from "node:url";
import { JsonFileRepository } from "@infra/json/json-file.repository.js";
import type { Project } from "../entities/project.entity.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const storagePath = path.resolve(dirname, "../../../storage/projects.json");

export class ProjectsRepository {
  private readonly repo = new JsonFileRepository<Project[]>(storagePath);

  async list() {
    return this.repo.read();
  }

  async findById(id: string) {
    const projects = await this.list();
    return projects.find((project) => project.id === id);
  }
}
