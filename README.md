# HandyBandi Business OS

A working first release of HandyBandi’s operations platform, built from an empty repository. It implements foundation/CRM and an estimate-to-dispatch vertical slice. **It is not the completed, production-ready platform described in the full brief.** No production website, DNS, customer messages, or payment accounts were changed.

The operations workspace now follows Housecall Pro inspired navigation, Home/open-item organization, pipeline boards, and customer list interactions. See [the CRM update](docs/CRM-REDESIGN.md) for the researched references, implemented behavior, and metric definitions.

The public site now includes the HandyBandi 2.0 editorial design, database-backed service pages, dedicated residential/commercial audience pages, and a progressive repair-list request with private photos. See [website details](docs/WEBSITE-2.md) and [staging deployment/access setup](docs/DEPLOYMENT.md). Source: https://github.com/Dimak7/hANDYBENDI, branch `codex/handybandi-2`.

## Open the local preview

- Website: http://localhost:3000
- Quote request: http://localhost:3000/request-quote
- Staff login: http://localhost:3000/login
- Workspace after login: http://localhost:3000/app
- Technician/customer/property-manager portal: http://localhost:3000/portal

The development owner is `owner@example.test`. Its randomly generated password is the `ADMIN_PASSWORD` value in your local, ignored `.env`. The owner name is Alex Morgan; this is a fictional demonstration account. No default password is embedded in source. The preview runs only while the app and PostgreSQL processes remain running.

## Stack

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, custom reusable React UI, Lucide icons, PostgreSQL, Prisma 6, Better Auth, Zod, Node test runner, and Playwright. This release uses a small custom component system rather than adding shadcn components that are not needed yet. PostgreSQL is the only business-data store. Better Auth owns credential hashing, cookies, sessions, and password resets. All amounts use integer cents; tax rates use basis points. Operational timestamps use `timestamptz`; business displays and day boundaries use America/Chicago.

The public preview reuses the business’s logo and locally hosted Inter and Manrope fonts. Its charcoal/coral/cream theme follows the audited site. Original brand assets and their source URLs are recorded in `scripts/brand-assets.mjs` and `docs/BUSINESS-AUDIT.md`.

## Development setup

Requires Node 24 and pnpm 11.25.0. Chrome is used by the browser tests.

```powershell
pnpm install --frozen-lockfile
pnpm setup:local
pnpm db:local
```

Keep the PostgreSQL process running. In another terminal:

```powershell
pnpm db:migrate
pnpm db:seed
pnpm admin:create
pnpm dev
```

`setup:local` creates `.env` once with random development credentials; it never overwrites an existing configuration. `db:local` starts a real, loopback-only PostgreSQL instance on port 55432, with UTF-8 data persisted under `.local-db/utf8`. The embedded PostgreSQL package is development tooling only. Use a managed PostgreSQL service for deployment. An existing external PostgreSQL instance is also supported by setting `DATABASE_URL` in `.env`.

`admin:create` refuses to overwrite an existing account. Skip it if the account has already been provisioned. On Windows, stop `pnpm dev` before `pnpm build` or `pnpm db:generate`: a running Prisma engine can lock its DLL and prevent regeneration.

`db:seed` always provisions the initial business configuration, pipeline, and service catalog. Fictional customers, employees, jobs, and ledger records are inserted **only** with `DEMO_MODE=true`, and never when `NODE_ENV=production`. Repeated seeding does not reset existing record edits. Demo technicians have no passwords. Do not enable demo mode against a business database.

## The implemented workflow

1. Submit a residential or commercial request with multiple services, address/access details, urgency, a preferred date/window, and optional communication preferences. This is an appointment request, not a reserved slot or a price promise.
2. Review the persistent request in `/app/leads`. Filter the board or table, export CSV, assign an owner, record the next action/deadline, change stage/priority, and add notes. Optimistic version checks prevent stale edits.
3. Open the lead and create an itemized estimate. Quantities, unit cents, discounts, tax rounding, terms, and expiration are validated on the server and constrained in PostgreSQL.
4. Share the estimate. A cryptographically random approval link is shown once; only its hash is stored on the estimate. Copy it to your customer. With a configured Resend sender, an email is queued instead of pretending to send.
5. The customer opens the private, expiring link and approves the scope with a typed signature and explicit acceptance. Approval is transactional and idempotent, creates evidence/audit records, updates the lead, and notifies staff. It does not reserve an appointment or collect money.
6. Dispatch creates one job from the approved estimate. Scheduling records a team and time window, checks collective skill coverage and recorded availability, locks employees to prevent concurrent booking races, and rejects overlaps including travel buffers. Only an owner/manager can record qualification/availability overrides or licensing/permit reviews.
7. Technicians see only their own assignments in `/portal`, open directions, and record valid progress transitions. Dispatch records sign-off evidence and closure; these actions are auditable. This release does not capture a handwritten customer signature or job photos.
8. Dashboard, customer profiles, schedule, and reports read the same stored records. Financial screens report the ledger; issuing invoices and collecting payments are not implemented.

## Admin onboarding and access

Set `ADMIN_EMAIL`, `ADMIN_PASSWORD` (12+ characters), and `ADMIN_NAME`, then run:

```powershell
pnpm admin:create
```

The default role is `OWNER`. Set `STAFF_ROLE` to `MANAGER`, `DISPATCHER`, `ESTIMATOR`, `TECHNICIAN`, `ACCOUNTING`, `ACCOUNT_MANAGER`, `CUSTOMER`, or `PROPERTY_MANAGER` when provisioning another account. For a technician, `STAFF_PHONE` and comma-separated service slugs in `STAFF_SKILLS` are optional. Their employment classification begins as unverified. Availability/profile editing is not yet implemented; the dispatcher must request a manager review when availability has not been recorded.

The CLI reads the environment on each invocation. Change or clear `STAFF_ROLE` deliberately between provisioning commands. Prefer a secret manager in production; never commit passwords or publish them in terminal logs. Provisioning marks the email as verified because an authorized operator establishes the account; employee invitation delivery is a later feature.

```powershell
pnpm staff:access disable worker@example.com
pnpm staff:access enable worker@example.com
pnpm staff:access link-customer customer@example.com CUSTOMER_ID
pnpm staff:access link-properties manager@example.com PROPERTY_ID_1 PROPERTY_ID_2
```

Disabling access revokes sessions. The last active owner cannot be disabled. Linking properties replaces that manager’s authorized property set; each property ID is validated. Customers see records attached to their linked customer; property managers see only individually authorized properties and their linked jobs/estimates. There is no public sign-up or automatic email-based account linking. Internal employees have role-based capabilities defined in `src/lib/permissions.ts`; editable permission matrices and MFA remain planned.

## Email, automations, and integrations

Set `RESEND_API_KEY`, `EMAIL_FROM`, and optionally `OFFICE_EMAIL`. Verify the sender domain with Resend. Run:

```powershell
pnpm worker
# Or run continuously, with a batch every 15 seconds:
pnpm worker:loop
```

The worker claims queued emails using PostgreSQL row locks and `SKIP LOCKED`, sends with a stable provider idempotency key, retries with backoff, and records failures after five attempts. Delivered private links are redacted from the event payload. The owner can inspect execution state in `/app/help`. Response-SLA notifications are deduplicated; they currently evaluate new leads only. Follow-up dates are stored and displayed; automatic deadline reminders are still planned.

Without Resend configuration, sharing an estimate provides a real private link for manual delivery. No email is simulated. Password reset requires configured email delivery and a running worker. The app does not send SMS or promotional campaigns. Consent is recorded separately for service SMS and email marketing; neither is preselected. Stripe, Twilio, object storage, and geocoding environment entries are reserved setup references, **not completed adapters**.

Production public intake requires both Turnstile keys. Without the server key, production intake fails closed and directs users to call the office. Development mode allows local testing. Configure `TRUST_PROXY=true` only behind a proxy that overwrites `x-forwarded-for`; otherwise the rate limiter deliberately shares a conservative bucket. Public forms also use a honeypot, input/body limits, same-origin checks, and database-backed throttling.

## Tests and build

```powershell
pnpm test             # 6 domain tests
pnpm test:db          # 13 PostgreSQL integration tests
pnpm test:browser     # 6 Chrome browser tests; app and local seed must be running
pnpm check           # strict TypeScript
pnpm build           # Prisma generation and optimized Next.js build
```

Database tests migrate a fresh, uniquely named PostgreSQL schema, verify persistence with a second client, and drop only that test schema afterward. They do not reset business data. Browser tests use the configured local owner and create clearly named fictional requests; run them only in a development/demo database. Screenshots are written to ignored `artifacts/`.

Verified: real request persistence, idempotent intake, profile overwrite protection, stale update rejection, estimate arithmetic/sharing/approval/expiry, single-job conversion, scheduling buffers/conflicts, qualification/licensing gates, technician assignment checks, property-manager query isolation, SLA deduplication, authenticated/anonymous API permissions, disabled accounts, and the full browser quote-to-job flow. Password reset email delivery, production bot verification, provider email delivery, Docker execution, and Railway deployment have not been exercised with live credentials/infrastructure. Payment-webhook and warranty tests are not claimed because those workflows are not implemented.

## Delivery and next phases

- [Original full product brief](docs/PRODUCT-BRIEF.md)
- [Business audit and SEO policy](docs/BUSINESS-AUDIT.md)
- [Railway deployment and operational setup](docs/DEPLOYMENT.md)
- [Architecture, data boundaries, and calculations](docs/ARCHITECTURE.md)
- [Completed functionality and remaining work](docs/STATUS.md)
- [Prisma schema](prisma/schema.prisma) and versioned SQL migrations under `prisma/migrations/`
- [Environment template](.env.example)

The existing site remains the source for long-form service/area content, blog, portfolio, careers, privacy, and terms. The new preview is intentionally `noindex` and disallows crawling. Do not put it on `handybandi.com` until the content/SEO migration and production release gates are completed.
