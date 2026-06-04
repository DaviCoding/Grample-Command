import path from "node:path";
import { fileURLToPath } from "node:url";
import { JsonFileRepository } from "@infra/json/json-file.repository.js";
const dirname = path.dirname(fileURLToPath(import.meta.url));
const storagePath = path.resolve(dirname, "../../../storage/projects.json");
export class ProjectsRepository {
    repo = new JsonFileRepository(storagePath);
    async list() {
        return this.repo.read();
    }
    async findById(id) {
        const projects = await this.list();
        return projects.find((project) => project.id === id);
    }
}
