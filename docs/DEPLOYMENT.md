# Railway staging deployment

The user approved a separate billable staging environment on 2026-10-19. The existing handybandi.com site and DNS are unchanged.

- GitHub: https://github.com/Dimak7/hANDYBENDI
- Source branch: `codex/handybandi-2`
- Railway project: HandyBandi Platform (`2b19c586-2d66-49da-bef7-f5699dc17e12`)
- Environment: staging (`0cde047c-8d8d-47ad-a025-6312aa1ddbb1`)
- Assigned staging URL: https://handybandi-web-staging.up.railway.app
- Services: HandyBandi Web, Postgres, HandyBandi Worker
- Private object storage: QuotePhotos, region iad

Deployment configuration is managed using Railway service settings through the connected Railway tools. New Railway services no longer support the deprecated railway.json/railway.toml configuration system. No legacy config file is left in this repository. For a future configuration-as-code rollout, import the existing project into `.railway/railway.ts`, preview the complete change set, and preserve all resources and secrets. [Current Railway documentation](https://docs.railway.com/infrastructure-as-code).

## Build and runtime

The Dockerfile uses Node 24, pnpm 11.25.0 and the frozen lockfile. It copies pnpm-workspace.yaml before installing so approved native build scripts are available on Linux. It builds the Next standalone server and copies public/static assets into its runtime directory. The image runs as the node user on 0.0.0.0:3000.

Web service settings:

- Dockerfile: `Dockerfile`
- Pre-deploy command: `pnpm deploy:prepare`
- Start command: `pnpm start`
- Readiness: `/api/health`, 120-second timeout
- Restart policy: on failure
- GitHub pushes to the linked branch trigger deployment

`deploy:prepare` applies the four migrations, seeds the catalog/settings with DEMO_MODE=false, then bootstraps the first owner if none exists. Existing accounts and credentials are never overwritten. Health checks require both database connectivity and initialized business settings/catalog.

Worker settings use the same image but start `pnpm worker:loop`, have no public domain, and do not use an HTTP healthcheck. Successful batches are logged every 15 seconds. No transactional email is sent until verified Resend credentials and sender are configured.

## Secrets and initial access

Each environment has an independent random Better Auth secret. The staging owner's unique strong password was generated locally, not copied from the development demo. Initial credentials are in the local ignored `artifacts/staging-access.json`; this file is never committed. ADMIN_PASSWORD should be cleared from the web service after successful one-time provisioning. Future owner/staff provisioning can use the documented CLI through a trusted service console. Password reset needs a configured Resend sender.

Database variables reference Postgres directly. S3 variables reference QuotePhotos directly, including its access key/secret. These values stay in Railway; bucket credentials were not read into frontend code or committed. Shared variables are not used as an extra reference hop for resource credentials.

Required runtime variables include DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, DEMO_MODE=false, and the S3 endpoint/bucket/region/access-key/secret settings. Public build arguments are NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_STAGING, and NEXT_PUBLIC_TURNSTILE_SITE_KEY. Authentication initializes at request time so private runtime secrets do not need to be copied into Docker build arguments.

## Staging protection and launch requirements

This is a testing environment with a visible staging banner, noindex metadata and robots blocking. Use fictional test records only. Cloudflare's official testing keys are used for staging form verification; the server rejects the always-pass test key outside Railway's staging environment. Live bot protection is not configured. Replace both test keys with verified hostname-scoped production keys before accepting real customers. [Cloudflare testing documentation](https://developers.cloudflare.com/turnstile/troubleshooting/testing/).

Private photo uploads support authenticated CRM proxy downloads; the S3 adapter is tested separately from local filesystem storage. Original names and EXIF/GPS metadata are discarded. Object lifecycle/orphan cleanup, retention policy and restoration procedures still need operational review.

Railway's backup UI reports that creating backups and automated schedules requires the Pro plan. No subscription upgrade was performed. The owner must choose a plan, then enable daily/weekly backups and complete an isolated restore drill before relying on this system for business data. [Backup setup](https://docs.railway.com/guides/postgres-backups-restores).

No Stripe, Twilio, Resend, Google, Meta or hh.kz account is connected. No paid advertisement or real vacancy has been published. No messages have been sent to real recipients. Monitoring currently consists of Railway runtime/build logs and the database-aware healthcheck; external alert delivery/error reporting is not connected.

## Verification and rollback

`pnpm lint` runs TypeScript and formatting checks. Domain, isolated PostgreSQL, browser and production build checks must pass before release. `scripts/verify-staging.mjs` is restricted to this exact staging domain, reads credentials from the ignored local file, and creates clearly labeled fictional verification records. It checks owner sign-in, anonymous access denial, catalog initialization, persisted requests, idempotent retry and private cloud photo access. Verification output is local/ignored.

Record deployment-specific results in the release notes. A successful build or assigned domain alone is not proof of working forms, storage, seeded configuration or staff access. Do not claim these without the smoke-test result.

Rollback application images only when their schema remains compatible. Do not reverse data migrations or delete operational records automatically. Before a live launch, finish the remaining modules and security checks in STATUS.md and obtain explicit approval for domain migration.
