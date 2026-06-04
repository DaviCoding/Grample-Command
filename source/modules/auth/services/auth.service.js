import { env } from "@config/env.js";
import { PasswordService } from "@infra/security/password.service.js";
import { SessionService } from "@infra/security/session.service.js";
import { CookieService } from "@infra/security/cookie.service.js";
import { CsrfService } from "@infra/security/csrf.service.js";
export class AuthService {
    password = new PasswordService();
    session = new SessionService();
    cookies = new CookieService();
    csrf = new CsrfService();
    createLoginCsrf(reply) {
        const token = this.csrf.create();
        this.cookies.setLoginCsrf(reply, token);
        return token;
    }
    authenticate(input, request, reply) {
        const loginCsrf = this.cookies.readLoginCsrf(request);
        if (!this.csrf.verify(input._csrf, loginCsrf)) {
            return false;
        }
        const validUsername = input.username === env.COMMAND_ADMIN_USERNAME;
        const validPassword = this.password.verify(input.password, env.COMMAND_ADMIN_PASSWORD_HASH);
        if (!validUsername || !validPassword) {
            return false;
        }
        const session = this.session.create(input.username);
        this.cookies.setSession(reply, session.token, env.COMMAND_SESSION_TTL_SECONDS);
        this.cookies.clearLoginCsrf(reply);
        return true;
    }
    signOut(reply) {
        this.cookies.clearSession(reply);
    }
}
