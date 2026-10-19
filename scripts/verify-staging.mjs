import { readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
const credentials = JSON.parse(await readFile("artifacts/staging-access.json", "utf8"));
const origin = new URL(credentials.url).origin;
if (origin !== "https://handybandi-web-staging.up.railway.app")
  throw new Error(
    "This verification script is restricted to the separate HandyBandi staging site.",
  );
const cookies = new Map();
async function send(path, options = {}, authenticated = true) {
  const headers = new Headers(options.headers);
  if (options.method && options.method !== "GET") headers.set("Origin", origin);
  if (authenticated && cookies.size)
    headers.set("Cookie", [...cookies].map(([k, v]) => `${k}=${v}`).join("; "));
  const response = await fetch(`${origin}${path}`, { ...options, headers, redirect: "manual" });
  if (authenticated)
    for (const value of response.headers.getSetCookie()) {
      const pair = value.split(";")[0];
      const at = pair.indexOf("=");
      cookies.set(pair.slice(0, at), pair.slice(at + 1));
    }
  return response;
}
const json = (data) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});
const results = [];
for (const path of [
  "/api/health",
  "/",
  "/services",
  "/services/tv-mounting",
  "/commercial",
  "/request-quote",
  "/sitemap.xml",
]) {
  const response = await send(path);
  assert.equal(response.status, 200, path);
  const body = await response.text();
  if (path === "/") {
    assert.ok(
      body.includes('href="/services/tv-mounting"'),
      "Database catalog must be initialized",
    );
    assert.ok(body.includes("STAGING TEST SITE"));
  }
  results.push(`${path}: 200`);
}
assert.equal((await send("/api/export?type=customers", {}, false)).status, 401);
assert.equal((await send("/app", {}, false)).status, 307);
const login = await send(
  "/api/auth/sign-in/email",
  json({ email: credentials.email, password: credentials.password }),
);
assert.equal(login.status, 200, `Owner sign-in returned ${login.status}`);
assert.equal((await send("/app")).status, 200);
results.push("Owner login and anonymous access restrictions: pass");
const marker = randomUUID().slice(0, 8),
  name = `STAGING VERIFICATION ${marker}`;
const data = {
  name,
  email: `staging-${marker}@example.test`,
  phone: "3125550100",
  type: "RESIDENTIAL",
  address: "100 Fictional Verification Avenue",
  city: "Chicago",
  postalCode: "60640",
  description: `STAGING VERIFICATION ${marker}: mount a fictional television. No real appointment or payment.`,
  serviceIds: ["tv-mounting"],
  priority: "NORMAL",
  smsConsent: false,
  emailMarketingConsent: false,
  source: "staging-verification",
  submissionKey: randomUUID(),
  website: "",
  turnstileToken: "XXXX.DUMMY.TOKEN.XXXX",
};
const form = new FormData();
form.set("data", JSON.stringify(data));
form.set(
  "photos",
  new File([await readFile("public/images/drain-project.webp")], "fictional-test.webp", {
    type: "image/webp",
  }),
);
const intake = await send("/api/intake", { method: "POST", body: form }, false);
if (intake.status !== 201) throw new Error(`Quote intake ${intake.status}: ${await intake.text()}`);
const lead = await intake.json();
const retry = await send("/api/intake", json(data), false);
assert.equal((await retry.json()).number, lead.number);
const listing = await (await send(`/app/leads?q=${encodeURIComponent(name)}&view=table`)).text();
const leadId = [...listing.matchAll(/href="\/app\/leads\/([^"?]+)"/g)][0]?.[1];
assert.ok(leadId, "Saved lead must appear in authenticated CRM search");
const detail = await (await send(`/app/leads/${leadId}`)).text();
const photoId = [...detail.matchAll(/\/api\/photos\/([a-z0-9]+)/g)][0]?.[1];
assert.ok(photoId, "Saved photo must appear on the lead");
assert.equal((await send(`/api/photos/${photoId}`, {}, false)).status, 401);
const image = await send(`/api/photos/${photoId}`);
assert.equal(image.status, 200);
assert.equal(image.headers.get("content-type"), "image/webp");
assert.ok((await image.arrayBuffer()).byteLength > 0);
results.push(
  `Quote HB-${lead.number}: persisted, idempotent retry, private S3 photo download: pass`,
);
await writeFile(
  "artifacts/staging-verification.json",
  JSON.stringify(
    {
      origin,
      checkedAt: new Date().toISOString(),
      results,
      fixture: { name, leadId, number: lead.number },
    },
    null,
    2,
  ),
);
console.log(results.join("\n"));
