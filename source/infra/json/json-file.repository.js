import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
export class JsonFileRepository {
    filePath;
    constructor(filePath) {
        this.filePath = filePath;
    }
    async read() {
        const content = await readFile(this.filePath, "utf-8");
        return JSON.parse(content);
    }
    async write(data) {
        await mkdir(path.dirname(this.filePath), { recursive: true });
        await writeFile(this.filePath, JSON.stringify(data, null, 2), "utf-8");
    }
}
