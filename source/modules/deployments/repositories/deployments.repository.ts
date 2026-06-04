import path from "node:path";
import { fileURLToPath } from "node:url";
import { JsonFileRepository } from "@infra/json/json-file.repository.js";
import type { Deployment } from "../entities/deployment.entity.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const storagePath = path.resolve(dirname, "../../../storage/deployments.json");

export class DeploymentsRepository {
  private readonly repo = new JsonFileRepository<Deployment[]>(storagePath);

  async list() {
    const items = await this.repo.read();
    return [...items].reverse();
  }

  async append(deployment: Deployment) {
    const items = await this.repo.read();
    items.push(deployment);
    await this.repo.write(items);
    return deployment;
  }

  async update(id: string, patch: Partial<Deployment>) {
    const items = await this.repo.read();
    const index = items.findIndex((item) => item.id === id);

    if (index === -1) {
      throw new Error("Deployment not found");
    }

    const current = items[index];

    if (!current) {
      throw new Error("Deployment not found");
    }

    const next: Deployment = {
      ...current,
      ...patch
    };

    items[index] = next;
    await this.repo.write(items);

    return next;
  }
}
