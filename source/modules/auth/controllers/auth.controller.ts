import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "@config/env.js";
import { AuditService } from "@infra/audit/audit.service.js";
import { RateLimitService } from "@infra/rate-limit/rate-limit.service.js";
import { getRequestIp } from "@shared/http/request-context.js";
import { signInSchema } from "../schemas/auth.zod.js";
import { AuthService } from "../services/auth.service.js";

export class AuthController {
  private readonly auth = new AuthService();
  private readonly audit = new AuditService();
  private readonly loginRateLimit = new RateLimitService();

  async signInPage(_request: FastifyRequest, reply: FastifyReply) {
    const csrfToken = this.auth.createLoginCsrf(reply);

    return reply.view("pages/auth/sign-in", {
      title: "Entrar",
      csrfToken
    });
  }

  async signIn(request: FastifyRequest, reply: FastifyReply) {
    const ip = getRequestIp(request);
    const limit = this.loginRateLimit.consume(`login:${ip}`, {
      windowSeconds: env.LOGIN_RATE_LIMIT_WINDOW_SECONDS,
      maxAttempts: env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
      blockSeconds: env.LOGIN_RATE_LIMIT_BLOCK_SECONDS
    });

    if (!limit.allowed) {
      reply.header("Retry-After", String(limit.retryAfterSeconds));
      await this.audit.record(request, {
        action: "auth.sign_in",
        targetType: "session",
        status: "failure",
        metadata: { reason: "rate_limited" }
      });

      return reply.code(429).send({ message: "Muitas tentativas. Tente novamente mais tarde." });
    }

    // text2 = username
    // text1 = password

    const input = signInSchema.safeParse(request.body);

    if (!input.success) {
      return this.renderInvalidSignIn(request, reply, "Dados inválidos.");
    }

    const authenticated = this.auth.authenticate(input.data, request, reply);

    if (!authenticated) {
      await this.audit.record(request, {
        action: "auth.sign_in",
        targetType: "session",
        status: "failure",
        metadata: { username: input.data.text2 }
      });

      return this.renderInvalidSignIn(request, reply, "Usuário ou senha inválidos.");
    }

    this.loginRateLimit.reset(`login:${ip}`);

    await this.audit.record(request, {
      actor: input.data.text2,
      action: "auth.sign_in",
      targetType: "session",
      status: "success"
    });

    return reply.redirect("/");
  }

  async signOut(request: FastifyRequest, reply: FastifyReply) {
    await this.audit.record(request, {
      action: "auth.sign_out",
      targetType: "session",
      status: "success"
    });

    this.auth.signOut(reply);
    return reply.redirect("/sign-in");
  }

  private async renderInvalidSignIn(request: FastifyRequest, reply: FastifyReply, message: string) {
    const csrfToken = this.auth.createLoginCsrf(reply);

    return reply.code(401).view("pages/auth/sign-in", {
      title: "Entrar",
      csrfToken,
      error: message
    });
  }
}
