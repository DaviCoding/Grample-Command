import { env } from "@config/env.js";
const SESSION_COOKIE = "grample_command_session";
const LOGIN_CSRF_COOKIE = "grample_command_login_csrf";
function serializeCookie(name, value, options = {}) {
    const parts = [
        `${name}=${value}`,
        "Path=/",
        "SameSite=Lax"
    ];
    if (options.httpOnly)
        parts.push("HttpOnly");
    if (env.COMMAND_COOKIE_SECURE)
        parts.push("Secure");
    if (options.maxAge !== undefined)
        parts.push(`Max-Age=${options.maxAge}`);
    return parts.join("; ");
}
export class CookieService {
    read(request, name) {
        const cookieHeader = request.headers.cookie;
        if (!cookieHeader)
            return null;
        const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
        const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));
        if (!match)
            return null;
        return decodeURIComponent(match.slice(name.length + 1));
    }
    setSession(reply, value, maxAge) {
        this.append(reply, serializeCookie(SESSION_COOKIE, encodeURIComponent(value), {
            httpOnly: true,
            maxAge
        }));
    }
    clearSession(reply) {
        this.append(reply, serializeCookie(SESSION_COOKIE, "", {
            httpOnly: true,
            maxAge: 0
        }));
    }
    readSession(request) {
        return this.read(request, SESSION_COOKIE);
    }
    setLoginCsrf(reply, value) {
        this.append(reply, serializeCookie(LOGIN_CSRF_COOKIE, encodeURIComponent(value), {
            maxAge: 60 * 15
        }));
    }
    clearLoginCsrf(reply) {
        this.append(reply, serializeCookie(LOGIN_CSRF_COOKIE, "", { maxAge: 0 }));
    }
    readLoginCsrf(request) {
        return this.read(request, LOGIN_CSRF_COOKIE);
    }
    append(reply, cookie) {
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
