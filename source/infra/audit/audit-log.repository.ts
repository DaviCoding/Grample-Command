import path from "node:path";
import { JsonFileRepository } from "@infra/json/json-file.repository.js";
import type { AuditEvent } from "./audit-event.entity.js";

const storagePath = path.resolve("source/storage/audit-events.json");

export class AuditLogRepository {
  private readonly repository = new JsonFileRepository<AuditEvent[]>(storagePath);

  async list() {
    return this.repository.read();
  }

  async append(event: AuditEvent) {
    const events = await this.list();
    events.unshift(event);
    await this.repository.write(events.slice(0, 1000));
  }
}
