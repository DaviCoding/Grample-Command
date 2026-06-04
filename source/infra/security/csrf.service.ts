import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@config/env.js";

export class CsrfService {
  create() {
    const token = randomBytes(32).toString("base64url");
    const signature = this.sign(token);

    return `${token}.${signature}`;
  }

  verify(received: string | undefined, expected: string | null) {
    if (!received || !expected || received !== expected) {
      return false;
    }

    const [token, signature] = received.split(".");
    if (!token || !signature) {
      return false;
    }

    const expectedSignature = Buffer.from(this.sign(token), "base64url");
    const receivedSignature = Buffer.from(signature, "base64url");

    if (expectedSignature.length !== receivedSignature.length) {
      return false;
    }

    return timingSafeEqual(expectedSignature, receivedSignature);
  }

  private sign(token: string) {
    return createHmac("sha256", env.COMMAND_SESSION_SECRET)
      .update(token)
      .digest("base64url");
  }
}
