import { env } from "@config/env.js";
import { ShellService } from "@infra/shell/shell.service.js";

export type GitStatus = {
  currentCommit: string;
  remoteCommit: string;
  behind: number;
  updateAvailable: boolean;
  logs: string[];
};

export class GitService {
  private readonly shell = new ShellService();

  async clone(repository: string, branch: string, targetPath: string) {
    const authenticatedRepository = this.withToken(repository);

    const clone = await this.shell.run("git", [
      "clone",
      "--branch",
      branch,
      authenticatedRepository,
      targetPath
    ]);

    if (clone.exitCode === 0) {
      await this.shell.run("git", ["remote", "set-url", "origin", repository], targetPath);
    }

    return clone;
  }

  async check(projectPath: string, branch: string): Promise<GitStatus> {
    const logs: string[] = [];

    const repository = await this.getOriginUrl(projectPath);
    const authenticatedRepository = this.withToken(repository);

    const fetch = await this.shell.run(
      "git",
      ["fetch", authenticatedRepository, branch],
      projectPath
    );

    logs.push(this.format(fetch.command, fetch.stdout, fetch.stderr));

    if (fetch.exitCode !== 0) {
      throw new Error(
        this.errorMessage("git fetch failed", fetch.command, fetch.exitCode, fetch.stdout, fetch.stderr)
      );
    }

    const local = await this.shell.run("git", ["rev-parse", "HEAD"], projectPath);
    const remote = await this.shell.run("git", ["rev-parse", "FETCH_HEAD"], projectPath);
    const behind = await this.shell.run("git", ["rev-list", "--count", "HEAD..FETCH_HEAD"], projectPath);

    logs.push(this.format(local.command, local.stdout, local.stderr));
    logs.push(this.format(remote.command, remote.stdout, remote.stderr));
    logs.push(this.format(behind.command, behind.stdout, behind.stderr));

    const currentCommit = local.stdout.trim();
    const remoteCommit = remote.stdout.trim();
    const behindCount = Number(behind.stdout.trim() || "0");

    return {
      currentCommit,
      remoteCommit,
      behind: Number.isFinite(behindCount) ? behindCount : 0,
      updateAvailable: currentCommit !== remoteCommit,
      logs
    };
  }

  async pull(projectPath: string, branch: string) {
    const repository = await this.getOriginUrl(projectPath);
    const authenticatedRepository = this.withToken(repository);

    return this.shell.run(
      "git",
      ["pull", authenticatedRepository, branch],
      projectPath
    );
  }

  private async getOriginUrl(projectPath: string) {
    const result = await this.shell.run("git", ["remote", "get-url", "origin"], projectPath);

    if (result.exitCode !== 0) {
      throw new Error(result.stderr || "Could not get git origin url");
    }

    return result.stdout.trim();
  }

  private withToken(repository: string) {
    if (!env.GITHUB_TOKEN) {
      return repository;
    }

    if (!repository.startsWith("https://github.com/")) {
      return repository;
    }

    return repository.replace(
      "https://github.com/",
      `https://x-access-token:${env.GITHUB_TOKEN}@github.com/`
    );
  }

  private format(command: string, stdout: string, stderr: string) {
    return [`$ ${this.maskToken(command)}`, stdout, stderr].filter(Boolean).join("\n");
  }

  private errorMessage(label: string, command: string, exitCode: number | undefined, stdout: string, stderr: string) {
    return [
      label,
      `Command: ${this.maskToken(command)}`,
      `ExitCode: ${exitCode ?? "unknown"}`,
      stdout ? `STDOUT:\n${stdout}` : "",
      stderr ? `STDERR:\n${stderr}` : ""
    ]
      .filter(Boolean)
      .join("\n");
  }

  private maskToken(value: string) {
    if (!env.GITHUB_TOKEN) {
      return value;
    }

    return value.replaceAll(env.GITHUB_TOKEN, "***");
  }
}