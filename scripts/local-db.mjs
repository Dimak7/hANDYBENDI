import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
if (!process.env.DATABASE_URL) throw new Error("Run pnpm setup:local first.");
const connection = new URL(process.env.DATABASE_URL);
if (!["localhost", "127.0.0.1"].includes(connection.hostname))
  throw new Error(
    "db:local only supports a loopback DATABASE_URL. Use your external PostgreSQL service directly.",
  );
const databaseName = connection.pathname.slice(1);
const port = Number(connection.port || 55432);
const postgres = new EmbeddedPostgres({
  databaseDir: ".local-db/utf8",
  user: decodeURIComponent(connection.username),
  password: decodeURIComponent(connection.password),
  port,
  persistent: true,
  initdbFlags: ["--encoding=UTF8"],
  postgresFlags: ["-c", "timezone=UTC", "-c", "listen_addresses=127.0.0.1"],
});
if (!existsSync(".local-db/utf8/PG_VERSION")) await postgres.initialise();
await postgres.start();
try {
  await postgres.createDatabase(databaseName);
} catch (e) {
  if (!String(e).includes("already exists")) throw e;
}
console.log(`Local PostgreSQL ready on 127.0.0.1:${port}. Data persists in .local-db.`);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    await postgres.stop();
    process.exit();
  });
setInterval(() => {}, 60000);
