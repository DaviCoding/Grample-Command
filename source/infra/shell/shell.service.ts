import { execa } from "execa";

export type ShellResult = {
  command: string;
  exitCode: number | undefined;
  stdout: string;
  stderr: string;
};

export class ShellService {
  async run(command: string, args: string[], cwd?: string, env?: NodeJS.ProcessEnv): Promise<ShellResult> {
    const result = await execa(command, args, {
      reject: false,
      shell: process.platform === "win32",
      ...(cwd ? { cwd } : {}),
      ...(env ? { env } : {})
    });

    return {
      command: [command, ...args].join(" "),
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr
    };
  }
}
