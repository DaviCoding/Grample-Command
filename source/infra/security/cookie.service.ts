import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "@config/env.js";

const SESSION_COOKIE = "grample_command_session";
const LOGIN_CSRF_COOKIE = "grample_command_login_csrf";

type CookieOptions = {
  httpOnly?: boolean;
  maxAge?: number;
};

function serializeCookie(name: string, value: string, options: CookieOptions = {}) {
  const parts = [
    `${name}=${value}`,
    "Path=/",
    "SameSite=Lax"
  ];

  if (options.httpOnly) parts.push("HttpOnly");
  if (env.COMMAND_COOKIE_SECURE) parts.push("Secure");
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);

  return parts.join("; ");
}

export class CookieService {
  read(request: FastifyRequest, name: string) {
    const cookieHeader = request.headers.cookie;
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
    const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));

    if (!match) return null;

    return decodeURIComponent(match.slice(name.length + 1));
  }

  setSession(reply: FastifyReply, value: string, maxAge: number) {
    this.append(reply, serializeCookie(SESSION_COOKIE, encodeURIComponent(value), {
      httpOnly: true,
      maxAge
    }));
  }

  clearSession(reply: FastifyReply) {
    this.append(reply, serializeCookie(SESSION_COOKIE, "", {
      httpOnly: true,
      maxAge: 0
    }));
  }

  readSession(request: FastifyRequest) {
    return this.read(request, SESSION_COOKIE);
  }

  setLoginCsrf(reply: FastifyReply, value: string) {
    this.append(reply, serializeCookie(LOGIN_CSRF_COOKIE, encodeURIComponent(value), {
      maxAge: 60 * 15
    }));
  }

  clearLoginCsrf(reply: FastifyReply) {
    this.append(reply, serializeCookie(LOGIN_CSRF_COOKIE, "", { maxAge: 0 }));
  }

  readLoginCsrf(request: FastifyRequest) {
    return this.read(request, LOGIN_CSRF_COOKIE);
  }

  private append(reply: FastifyReply, cookie: string) {
    const current = reply.getHeader("Set-Cookie");

    if (!current) {
      reply.header("Set-Cookie", cookie);
      return;
    }

    if (Array.isArray(current)) {
      reply.header("Set-Cookie", [...current, cookie]);
      return;
    }

    reply.header("Set-Cookie", [String(current), cookie]);
  }
}
