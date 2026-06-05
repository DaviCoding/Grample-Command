import { ShellService } from "@infra/shell/shell.service.js";

export class DockerComposeService {
  private readonly shell = new ShellService();

  async up(projectPath: string, composeFile: string) {
    return this.shell.run("docker", ["compose", "-f", composeFile, "up", "-d", "--build"], projectPath);
  }

  async config(projectPath: string, composeFile: string) {
    return this.shell.run("docker", ["compose", "-f", composeFile, "config", "--quiet"], projectPath);
  }

  async ensureNetwork(name: string) {
    const inspect = await this.shell.run("docker", ["network", "inspect", name]);

    if (inspect.exitCode === 0) {
      return {
        status: "exists" as const,
        logs: [`$ ${inspect.command}`]
      };
    }

    const create = await this.shell.run("docker", ["network", "create", name]);

    return {
      status: create.exitCode === 0 ? "created" as const : "error" as const,
      logs: [`$ ${inspect.command}`, inspect.stderr, `$ ${create.command}`, create.stdout, create.stderr].filter(Boolean),
      exitCode: create.exitCode
    };
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
