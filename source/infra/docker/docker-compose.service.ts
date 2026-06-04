import { ShellService } from "@infra/shell/shell.service.js";

export class DockerComposeService {
  private readonly shell = new ShellService();

  async up(projectPath: string, composeFile: string) {
    return this.shell.run("docker", ["compose", "-f", composeFile, "up", "-d", "--build"], projectPath);
  }

  async start(projectPath: string, composeFile: string) {
    return this.shell.run("docker", ["compose", "-f", composeFile, "up", "-d"], projectPath);
  }

  async stop(projectPath: string, composeFile: string) {
    return this.shell.run("docker", ["compose", "-f", composeFile, "stop"], projectPath);
  }

  async restart(projectPath: string, composeFile: string) {
    return this.shell.run("docker", ["compose", "-f", composeFile, "restart"], projectPath);
  }

  async rebuild(projectPath: string, composeFile: string) {
    return this.shell.run("docker", ["compose", "-f", composeFile, "up", "-d", "--build", "--force-recreate"], projectPath);
  }

  async down(projectPath: string, composeFile: string) {
    return this.shell.run("docker", ["compose", "-f", composeFile, "down"], projectPath);
  }

  async ps(projectPath: string, composeFile: string) {
    return this.shell.run("docker", ["compose", "-f", composeFile, "ps", "--format", "json"], projectPath);
  }

  async logs(projectPath: string, composeFile: string, tail: number) {
    return this.shell.run("docker", ["compose", "-f", composeFile, "logs", "--no-color", "--tail", String(tail)], projectPath);
  }
}
