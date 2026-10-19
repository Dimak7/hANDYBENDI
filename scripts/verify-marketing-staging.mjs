import { readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
const credentials = JSON.parse(await readFile("artifacts/staging-access.json", "utf8"));
const origin = new URL(credentials.url).origin;
if (origin !== "https://handybandi-web-staging.up.railway.app")
  throw new Error("Restricted to HandyBandi staging.");
const login = await fetch(`${origin}/api/auth/sign-in/email`, {
  method: "POST",
  headers: { Origin: origin, "Content-Type": "application/json" },
  body: JSON.stringify({ email: credentials.email, password: credentials.password }),
});
assert.equal(login.status, 200);
const cookie = login.headers
  .getSetCookie()
  .map((v) => v.split(";")[0])
  .join("; ");
const marker = `staging-verification-${randomUUID().slice(0, 8)}`;
const date = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Chicago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
let spendId;
const results = [];
try {
  const anon = await fetch(`${origin}/app/marketing`, { redirect: "manual" });
  assert.equal(anon.status, 307);
  const hiring = await fetch(`${origin}/app/employees/applicants`, { headers: { Cookie: cookie } });
  assert.equal(hiring.status, 200);
  assert.ok((await hiring.text()).includes("Choose a location. Open a position."));
  const response = await fetch(`${origin}/api/marketing/spend`, {
    method: "POST",
    headers: { Origin: origin, Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      source: marker,
      campaign: "fictional-smoke-test",
      spentOn: date,
      amountCents: 100,
      note: "STAGING VERIFICATION ONLY. Fictional amount; no advertising purchased.",
      submissionKey: randomUUID(),
    }),
  });
  assert.equal(response.status, 201);
  spendId = (await response.json()).id;
  const page = await fetch(`${origin}/app/marketing?source=${marker}`, {
    headers: { Cookie: cookie },
  });
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.ok(html.includes(marker));
  assert.ok(html.includes("$1"));
  assert.ok(html.includes("Create a tracked campaign link"));
  results.push(
    "Owner login, grouped hiring, and marketing pages: pass",
    "Anonymous marketing access denied: pass",
    "Fictional spend saved and included in source analysis: pass",
  );
} finally {
  if (spendId) {
    const deleted = await fetch(`${origin}/api/marketing/spend/${spendId}`, {
      method: "DELETE",
      headers: { Origin: origin, Cookie: cookie },
    });
    assert.equal(deleted.status, 200);
  }
}
results.push("Fictional spend removed; no ad purchases or external messages.");
await writeFile(
  "artifacts/marketing-staging-verification.json",
  JSON.stringify({ verifiedAt: new Date().toISOString(), results }, null, 2),
);
console.log(results.join("\n"));
