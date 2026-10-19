import { readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
const credentials = JSON.parse(await readFile("artifacts/staging-access.json", "utf8"));
const origin = new URL(credentials.url).origin;
if (origin !== "https://handybandi-web-staging.up.railway.app")
  throw new Error("Restricted to HandyBandi staging.");
const cookies = new Map();
async function send(path, options = {}, authenticated = true) {
  const headers = new Headers(options.headers);
  if (options.method && options.method !== "GET") headers.set("Origin", origin);
  if (authenticated && cookies.size)
    headers.set("Cookie", [...cookies].map(([k, v]) => `${k}=${v}`).join("; "));
  const response = await fetch(`${origin}${path}`, { ...options, headers, redirect: "manual" });
  if (authenticated)
    for (const value of response.headers.getSetCookie()) {
      const pair = value.split(";")[0],
        at = pair.indexOf("=");
      cookies.set(pair.slice(0, at), pair.slice(at + 1));
    }
  return response;
}
const json = (data, method = "POST") => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});
const ids = [],
  marker = randomUUID().slice(0, 8),
  results = [];
try {
  assert.equal((await send("/api/health")).status, 200);
  assert.equal(
    (
      await send(
        "/api/auth/sign-in/email",
        json({ email: credentials.email, password: credentials.password }),
      )
    ).status,
    200,
  );
  for (const country of ["US", "KZ"]) {
    const response = await send(
      "/api/hiring/openings",
      json({
        title: `STAGING VERIFICATION ${country} ${marker}`,
        description: "Fictional hiring verification. No real vacancy or work is offered.",
        requiredSkills: ["support"],
        minimumYears: 1,
        requiredAvailability: [],
        country,
        city: country === "US" ? "Chicago" : "Almaty",
        workplace: "REMOTE",
        currency: country === "US" ? "USD" : "KZT",
        salaryPeriod: country === "US" ? "HOUR" : "MONTH",
        language: country === "US" ? "en" : "ru",
        questions: ["Describe a fictional test project."],
      }),
    );
    assert.equal(response.status, 201);
    ids.push((await response.json()).id);
  }
  assert.equal((await send(`/careers/${ids[1]}`, {}, false)).status, 404);
  assert.equal(
    (await send(`/api/hiring/openings/${ids[1]}`, json({ published: true, active: true }, "PATCH")))
      .status,
    200,
  );
  assert.equal((await send(`/careers/${ids[1]}`, {}, false)).status, 200);
  const data = {
    openingId: ids[1],
    name: `STAGING KZ APPLICANT ${marker}`,
    email: `staging-kz-${marker}@example.test`,
    phone: "+77015550101",
    country: "KZ",
    city: "Almaty",
    skills: ["support"],
    relevantYears: 2,
    availability: [],
    experience: "Fictional work history for staging verification only.",
    resumeText: "Fictional private application. No real person.",
    consent: true,
    answers: ["Fictional test project for verification."],
    source: "hh.kz",
    website: "",
    turnstileToken: "XXXX.DUMMY.TOKEN.XXXX",
  };
  assert.equal((await send("/api/careers/apply", json(data), false)).status, 201);
  assert.equal(
    (await send("/api/careers/apply", json({ ...data, name: "Overwrite attempt" }), false)).status,
    201,
  );
  const inbox = await (await send(`/app/employees/applicants/inbox?q=${marker}`)).text();
  assert.ok(inbox.includes(data.name));
  assert.ok(!inbox.includes("Overwrite attempt"));
  const profileId = [...inbox.matchAll(/href="\/app\/employees\/applicants\/([a-z0-9]+)"/g)]
    .map((m) => m[1])
    .find((v) => v !== "inbox");
  assert.ok(profileId);
  const detail = await (await send(`/app/employees/applicants/${profileId}`)).text();
  assert.ok(detail.includes(data.answers[0]));
  assert.ok(detail.includes(data.resumeText));
  assert.equal((await send(`/app/employees/applicants/${profileId}`, {}, false)).status, 307);
  const csv = `name,email,phone,country,experience\nSTAGING US APPLICANT ${marker},staging-us-${marker}@example.test,3125550199,US,Fictional work history for verification`;
  const importPayload = { openingId: ids[0], source: "Other", csv };
  const imported = await send("/api/hiring/import", json(importPayload));
  assert.equal(imported.status, 200);
  assert.equal((await imported.json()).results[0].status, "imported");
  const duplicate = await send("/api/hiring/import", json(importPayload));
  assert.equal((await duplicate.json()).results[0].status, "duplicate");
  assert.equal((await send("/api/hiring/import", json(importPayload), false)).status, 401);
  const both = await (await send(`/app/employees/applicants/inbox?q=${marker}`)).text();
  assert.ok(both.includes(data.name));
  assert.ok(both.includes(`STAGING US APPLICANT ${marker}`));
  for (const path of [
    "/careers",
    "/app/employees/hiring-connections",
    "/app/employees/applicants",
  ]) {
    assert.equal((await send(path)).status, 200);
  }
  results.push(
    "Owner login and new hiring pages: pass",
    "Draft/published careers listing and public application: pass",
    "Private answers, duplicate preservation and anonymous denial: pass",
    "US/KZ shared inbox and duplicate-safe CSV import: pass",
  );
} finally {
  for (const id of ids) {
    const response = await send(
      `/api/hiring/openings/${id}`,
      json({ published: false, active: false }, "PATCH"),
    );
    assert.equal(response.status, 200);
    assert.equal((await send(`/careers/${id}`, {}, false)).status, 404);
  }
}
results.push(
  "All fictional verification openings closed and unpublished; no external advertisements or messages sent.",
);
await writeFile(
  "artifacts/hiring-staging-verification.json",
  JSON.stringify({ verifiedAt: new Date().toISOString(), results, openingIds: ids }, null, 2),
);
console.log(results.join("\n"));
