import fs from "node:fs";
import { randomBytes } from "node:crypto";
if (fs.existsSync(".env")) {
  console.log(".env already exists. No settings or credentials were changed.");
  process.exit(0);
}
fs.writeFileSync(
  ".env",
  [
    `DATABASE_URL=postgresql://handybandi:${randomBytes(24).toString("hex")}@127.0.0.1:55432/handybandi?schema=public`,
    `BETTER_AUTH_SECRET=${randomBytes(48).toString("hex")}`,
    "BETTER_AUTH_URL=http://localhost:3000",
    "NEXT_PUBLIC_APP_URL=http://localhost:3000",
    "DEMO_MODE=true",
    "ADMIN_EMAIL=owner@example.test",
    "ADMIN_NAME=Alex Morgan",
    `ADMIN_PASSWORD=${randomBytes(18).toString("base64url")}`,
  ].join("\n") + "\n",
  { mode: 0o600 },
);
console.log(
  "Created an ignored .env with random local-only owner credentials. Read it locally; do not share or commit it.",
);
