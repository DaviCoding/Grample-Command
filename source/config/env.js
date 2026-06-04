import "dotenv/config";
import { z } from "zod";
const schema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_NAME: z.string().default("Grample Command"),
    APP_HOST: z.string().default("0.0.0.0"),
    APP_PORT: z.coerce.number().int().positive().default(4000),
    PROJECTS_BASE_PATH: z.string().min(1),
    GITHUB_TOKEN: z.string().optional(),
    BACKUP_DIR: z.string().default("/opt/command/backups"),
    COMMAND_ADMIN_USERNAME: z.string().min(3),
    COMMAND_ADMIN_PASSWORD_HASH: z.string().min(1),
    COMMAND_SESSION_SECRET: z.string().min(32),
    COMMAND_SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 8),
    COMMAND_COOKIE_SECURE: z
        .enum(["true", "false"])
        .default(process.env.NODE_ENV === "production" ? "true" : "false")
        .transform((value) => value === "true"),
    RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(120),
    LOGIN_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
    LOGIN_RATE_LIMIT_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
    LOGIN_RATE_LIMIT_BLOCK_SECONDS: z.coerce.number().int().positive().default(15 * 60)
});
export const env = schema.parse(process.env);
