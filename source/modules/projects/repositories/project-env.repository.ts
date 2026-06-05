import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { env } from "@config/env.js";
import { pathExists } from "@shared/fs/path-exists.js";

export class ProjectEnvRepository {
  private readonly basePath = path.resolve(env.PROJECT_ENVS_PATH);

  async exists(projectId: string) {
    return pathExists(this.resolve(projectId));
  }

  async read(projectId: string) {
    return readFile(this.resolve(projectId), "utf8");
  }

  async writeOnce(projectId: string, content: string) {
    await mkdir(this.basePath, { recursive: true });
    await writeFile(this.resolve(projectId), this.normalize(content), {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600
    });
  }

  resolve(projectId: string) {
    return path.join(this.basePath, `${projectId}.env`);
  }

  private normalize(content: string) {
    const normalized = content.replace(/\r\n/g, "\n");
    return normalized.endsWith("\n") ? normalized : `${normalized}\n`;
  }
}
