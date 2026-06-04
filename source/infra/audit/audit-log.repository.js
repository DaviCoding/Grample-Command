import path from "node:path";
import { JsonFileRepository } from "@infra/json/json-file.repository.js";
const storagePath = path.resolve("source/storage/audit-events.json");
export class AuditLogRepository {
    repository = new JsonFileRepository(storagePath);
    async list() {
        return this.repository.read();
    }
    async append(event) {
        const events = await this.list();
        events.unshift(event);
        await this.repository.write(events.slice(0, 1000));
    }
}
