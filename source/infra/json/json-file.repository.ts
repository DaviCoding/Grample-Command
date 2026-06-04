import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export class JsonFileRepository<T> {
  constructor(private readonly filePath: string) {}

  async read(): Promise<T> {
    const content = await readFile(this.filePath, "utf-8");
    return JSON.parse(content) as T;
  }

  async write(data: T): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(data, null, 2), "utf-8");
  }
}
