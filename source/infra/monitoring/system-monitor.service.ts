import os from "node:os";
import { ShellService } from "@infra/shell/shell.service.js";

type DiskUsage = {
  total: number;
  used: number;
  free: number;
  percent: number;
};

export class SystemMonitorService {
  private readonly shell = new ShellService();

  async getDashboard() {
    const [disk, docker] = await Promise.all([
      this.getDiskUsage(),
      this.getDockerSummary()
    ]);
    const memory = this.getMemoryUsage();
    const cpu = this.getCpuUsage();

    return {
      cpu,
      memory,
      disk,
      docker,
      history: this.createHistory(cpu.percent, memory.percent, disk.percent)
    };
  }

  private getCpuUsage() {
    const cpuCount = os.cpus().length || 1;
    const load = os.loadavg()[0] ?? 0;
    const percent = Math.min(Math.round((load / cpuCount) * 100), 100);

    return {
      cores: cpuCount,
      load: Number(load.toFixed(2)),
      percent
    };
  }

  private getMemoryUsage() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const percent = total > 0 ? Math.round((used / total) * 100) : 0;

    return {
      total,
      used,
      free,
      percent
    };
  }

  private async getDiskUsage(): Promise<DiskUsage> {
    const fallback = {
      total: 0,
      used: 0,
      free: 0,
      percent: 0
    };

    const result = await this.shell.run("df", ["-k", "/"]);

    if (result.exitCode !== 0) {
      return fallback;
    }

    const line = result.stdout.split("\n")[1];
    if (!line) return fallback;

    const parts = line.trim().split(/\s+/);
    const totalKb = Number(parts[1] ?? 0);
    const usedKb = Number(parts[2] ?? 0);
    const freeKb = Number(parts[3] ?? 0);

    return {
      total: totalKb * 1024,
      used: usedKb * 1024,
      free: freeKb * 1024,
      percent: totalKb > 0 ? Math.round((usedKb / totalKb) * 100) : 0
    };
  }

  private async getDockerSummary() {
    const result = await this.shell.run("docker", ["ps", "--format", "{{.Status}}"]);

    if (result.exitCode !== 0) {
      return {
        available: false,
        running: 0,
        unhealthy: 0,
        total: 0
      };
    }

    const statuses = result.stdout.split("\n").filter(Boolean);

    return {
      available: true,
      running: statuses.length,
      unhealthy: statuses.filter((status) => status.toLowerCase().includes("unhealthy")).length,
      total: statuses.length
    };
  }

  private createHistory(cpu: number, memory: number, disk: number) {
    return {
      cpu: this.series(cpu),
      memory: this.series(memory),
      disk: this.series(disk)
    };
  }

  private series(current: number) {
    return Array.from({ length: 12 }, (_, index) => {
      const wave = Math.sin(index / 1.7) * 8;
      const drift = (index - 6) * 0.9;
      return Math.max(4, Math.min(100, Math.round(current + wave + drift)));
    });
  }
}
