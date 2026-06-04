import { ShellService } from "@infra/shell/shell.service.js";
export class DockerComposeService {
    shell = new ShellService();
    async up(projectPath, composeFile) {
        return this.shell.run("docker", ["compose", "-f", composeFile, "up", "-d", "--build"], projectPath);
    }
}
