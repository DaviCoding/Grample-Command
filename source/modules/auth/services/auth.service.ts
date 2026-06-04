import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "@config/env.js";
import { PasswordService } from "@infra/security/password.service.js";
import { SessionService } from "@infra/security/session.service.js";
import { CookieService } from "@infra/security/cookie.service.js";
import { CsrfService } from "@infra/security/csrf.service.js";
import type { SignInInput } from "../schemas/auth.zod.js";

export class AuthService {
  private readonly password = new PasswordService();
  private readonly session = new SessionService();
  private readonly cookies = new CookieService();
  private readonly csrf = new CsrfService();

  createLoginCsrf(reply: FastifyReply) {
    const token = this.csrf.create();
    this.cookies.setLoginCsrf(reply, token);

    return token;
  }

  authenticate(input: SignInInput, request: FastifyRequest, reply: FastifyReply) {
    const loginCsrf = this.cookies.readLoginCsrf(request);

    if (!this.csrf.verify(input._csrf, loginCsrf)) {
      return false;
    }

    const validUsername = input.text2 === env.COMMAND_ADMIN_USERNAME;
    const validPassword = this.password.verify(input.text1, env.COMMAND_ADMIN_PASSWORD_HASH);

    if (!validUsername || !validPassword) {
      return false;
    }

    const session = this.session.create(input.text2);
    this.cookies.setSession(reply, session.token, env.COMMAND_SESSION_TTL_SECONDS);
    this.cookies.clearLoginCsrf(reply);

    return true;
  }

  verifyAdminPassword(password: string) {
    return this.password.verify(password, env.COMMAND_ADMIN_PASSWORD_HASH);
  }

  signOut(reply: FastifyReply) {
    this.cookies.clearSession(reply);
  }
}
