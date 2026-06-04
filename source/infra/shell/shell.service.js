import { execa } from "execa";
export class ShellService {
    async run(command, args, cwd, env) {
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
