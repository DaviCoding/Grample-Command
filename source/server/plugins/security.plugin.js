import { env } from "@config/env.js";
import { RateLimitService } from "@infra/rate-limit/rate-limit.service.js";
import { CookieService } from "@infra/security/cookie.service.js";
import { SessionService } from "@infra/security/session.service.js";
import { isBrowserNavigation, getRequestIp } from "@shared/http/request-context.js";
const publicRoutes = [
    { method: "GET", path: "/health" },
    { method: "GET", path: "/sign-in" },
    { method: "POST", path: "/sign-in" }
];
const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
function isPublicRoute(request) {
    if (request.url.startsWith("/public/"))
        return true;
    return publicRoutes.some((route) => (route.method === request.method && route.path === request.url.split("?")[0]));
}
function getCsrfToken(request) {
    const header = request.headers["x-csrf-token"];
    if (typeof header === "string") {
        return header;
    }
    const body = request.body;
    return typeof body?._csrf === "string" ? body._csrf : undefined;
}
function rejectUnauthorized(request, reply) {
    if (isBrowserNavigation(request)) {
        return reply.redirect("/sign-in");
    }
    return reply.code(401).send({ message: "Autenticação obrigatória." });
}
export async function securityPlugin(app) {
    const cookies = new CookieService();
    const session = new SessionService();
    const rateLimit = new RateLimitService();
    app.addHook("preHandler", async (request, reply) => {
        const limit = rateLimit.consume(`global:${getRequestIp(request)}`, {
            windowSeconds: env.RATE_LIMIT_WINDOW_SECONDS,
            maxAttempts: env.RATE_LIMIT_MAX_REQUESTS
        });
        if (!limit.allowed) {
            reply.header("Retry-After", String(limit.retryAfterSeconds));
            return reply.code(429).send({ message: "Muitas requisições. Tente novamente mais tarde." });
        }
        if (isPublicRoute(request)) {
            return;
        }
        const payload = session.verify(cookies.readSession(request));
        if (!payload) {
            return rejectUnauthorized(request, reply);
        }
        request.currentSession = payload;
        request.currentUser = { username: payload.username };
        if (!unsafeMethods.has(request.method)) {
            return;
        }
        const csrfToken = getCsrfToken(request);
        if (!csrfToken || csrfToken !== payload.csrfToken) {
            return reply.code(403).send({ message: "Token CSRF inválido." });
        }
    });
}
