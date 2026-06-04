import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const HASH_PREFIX = "scrypt";
const KEY_LENGTH = 64;

export class PasswordService {
  hash(password: string) {
    const salt = randomBytes(16).toString("base64url");
    const key = scryptSync(password, salt, KEY_LENGTH).toString("base64url");

    return `${HASH_PREFIX}$${salt}$${key}`;
  }

  verify(password: string, hash: string) {
    const [algorithm, salt, expectedKey] = hash.split("$");

    if (algorithm !== HASH_PREFIX || !salt || !expectedKey) {
      return false;
    }

    const receivedKey = scryptSync(password, salt, KEY_LENGTH);
    const expected = Buffer.from(expectedKey, "base64url");

    if (receivedKey.length !== expected.length) {
      return false;
    }

    return timingSafeEqual(receivedKey, expected);
  }
}
