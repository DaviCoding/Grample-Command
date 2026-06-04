import { env } from "@config/env.js";
import { buildApp } from "@server/app.js";

const app = await buildApp();

await app.listen({
  host: env.APP_HOST,
  port: env.APP_PORT
});
