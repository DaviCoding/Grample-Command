import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@config/env.js";
export class SessionService {
    create(username) {
        const now = Math.floor(Date.now() / 1000);
        const payload = {
            username,
            csrfToken: randomBytes(32).toString("base64url"),
            issuedAt: now,
            expiresAt: now + env.COMMAND_SESSION_TTL_SECONDS
        };
        const encodedPayload = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
        const signature = this.sign(encodedPayload);
        return {
            token: `${encodedPayload}.${signature}`,
            payload
        };
    }
    verify(token) {
        if (!token)
            return null;
        const [encodedPayload, signature] = token.split(".");
        if (!encodedPayload || !signature || !this.verifySignature(encodedPayload, signature)) {
            return null;
        }
        let payload;
        try {
            payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf-8"));
        }
        catch {
            return null;
        }
        if (payload.expiresAt <= Math.floor(Date.now() / 1000)) {
            return null;
        }
        return payload;
    }
    sign(encodedPayload) {
        return createHmac("sha256", env.COMMAND_SESSION_SECRET)
            .update(encodedPayload)
            .digest("base64url");
    }
    verifySignature(encodedPayload, receivedSignature) {
        const expected = Buffer.from(this.sign(encodedPayload), "base64url");
        const received = Buffer.from(receivedSignature, "base64url");
        if (expected.length !== received.length) {
            return false;
        }
        return timingSafeEqual(expected, received);
    }
}
