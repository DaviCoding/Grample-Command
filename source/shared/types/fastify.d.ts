import type { AuthenticatedUser } from "@modules/auth/dto/auth.dto.js";
import type { SessionPayload } from "@modules/auth/dto/auth.dto.js";

declare module "fastify" {
  interface FastifyRequest {
    currentUser?: AuthenticatedUser;
    currentSession?: SessionPayload;
  }
}
