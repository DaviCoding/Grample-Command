import path from "node:path";
import { fileURLToPath } from "node:url";
import { JsonFileRepository } from "@infra/json/json-file.repository.js";
const dirname = path.dirname(fileURLToPath(import.meta.url));
const storagePath = path.resolve(dirname, "../../../storage/deployments.json");
export class DeploymentsRepository {
    repo = new JsonFileRepository(storagePath);
    async list() {
        const items = await this.repo.read();
        return [...items].reverse();
    }
    async append(deployment) {
        const items = await this.repo.read();
        items.push(deployment);
        await this.repo.write(items);
        return deployment;
    }
    async update(id, patch) {
        const items = await this.repo.read();
        const index = items.findIndex((item) => item.id === id);
        if (index === -1) {
            throw new Error("Deployment not found");
        }
        const current = items[index];
        if (!current) {
            throw new Error("Deployment not found");
        }
        const next = {
            ...current,
            ...patch
        };
        items[index] = next;
        await this.repo.write(items);
        return next;
    }
}
