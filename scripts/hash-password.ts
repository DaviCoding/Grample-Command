import { PasswordService } from "../source/infra/security/password.service.js";

const password = process.argv[2];

if (!password) {
  console.error("Uso: pnpm hash:password \"sua-senha-forte\"");
  process.exit(1);
}

const passwordService = new PasswordService();
console.log(passwordService.hash(password));
