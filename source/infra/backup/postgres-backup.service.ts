import { mkdir } from "node:fs/promises";
import path from "node:path";
import { env } from "@config/env.js";
import { ShellService } from "@infra/shell/shell.service.js";

export type BackupResult = {
  skipped: boolean;
  filePath?: string;
  log: string;
};

function compactDate() {
  return new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
}

export class PostgresBackupService {
  private readonly shell = new ShellService();

  async dump(projectId: string, databaseUrlEnv?: string | null): Promise<BackupResult> {
    if (!databaseUrlEnv) {
      return {
        skipped: true,
        log: "Backup skipped: project has no databaseUrlEnv."
      };
    }

    const databaseUrl = process.env[databaseUrlEnv];

    if (!databaseUrl) {
      return {
        skipped: true,
        log: `Backup skipped: env ${databaseUrlEnv} not found.`
      };
    }

    const dir = path.join(env.BACKUP_DIR, projectId);
    await mkdir(dir, { recursive: true });

    const filePath = path.join(dir, `${projectId}-${compactDate()}.dump`);
    const result = await this.shell.run("pg_dump", [databaseUrl, "--format=custom", `--file=${filePath}`]);

    if (result.exitCode !== 0) {
      throw new Error(result.stderr || "pg_dump failed");
    }

    return {
      skipped: false,
      filePath,
      log: [`$ ${result.command}`, result.stdout, result.stderr].filter(Boolean).join("\\n")
    };
  }
}
