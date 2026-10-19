# Railway deployment and operational setup

Deployment artifacts are supplied, but a Railway deployment and container execution have not been tested here. Docker is not installed in the development environment. Treat the application as staging-only until the remaining features and operational checks in `STATUS.md` are complete. No live HandyBandi domain or existing site should be changed by these setup steps.

## Web service and database

1. Create a separate Railway project/environment for staging. Add managed PostgreSQL with a persistent volume and backup policy. Use a separate production database when launching.
2. Connect this repository as a web service and use the included `Dockerfile`. The image installs pinned dependencies from `pnpm-lock.yaml`, builds the app, and runs as the non-root `node` user. Node 24 is required for the supplied scripts.
3. Set the variables below. Do not upload the local demo `.env`, `.local-db`, browser artifacts, or owner credentials. They are ignored by Git and Docker.
4. `railway.json` supplies `pnpm db:migrate` as the pre-deploy command, `pnpm start` as the web start command, and `/api/health` as the readiness path. The app listens on the platform-provided `PORT` and `0.0.0.0` in production.
5. Run the catalog/config seed once with `DEMO_MODE=false`: `pnpm db:seed`. Runtime scripts accept platform environment variables without requiring a physical `.env` file.
6. Provision an owner through a trusted service shell/one-off execution using `ADMIN_EMAIL`, `ADMIN_NAME`, and a strong temporary `ADMIN_PASSWORD`, then run `pnpm admin:create`. Remove the provisioning password from service configuration afterward. Configure password reset delivery before sharing staff access.

Railway’s pre-deploy command runs before the new deployment serves requests and can gate deployment on migration success. Keep migrations backward compatible while older instances may still run. [Railway pre-deploy documentation](https://docs.railway.com/deployments/pre-deploy-command).

| Variable                         | Staging/production configuration                                                                                                       |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                   | Railway PostgreSQL connection; restrict access to app/migration roles and use appropriate encrypted transport for external connections |
| `BETTER_AUTH_SECRET`             | At least 32 random secret characters; independent of local and other environments                                                      |
| `BETTER_AUTH_URL`                | Exact HTTPS origin for this deployment; keep the configured trusted origin consistent with the hostname users visit                    |
| `NEXT_PUBLIC_APP_URL`            | Same deployed HTTPS origin, reserved for public link configuration                                                                     |
| `DEMO_MODE`                      | `false`; seed refuses fictional records when `NODE_ENV=production`                                                                     |
| `RESEND_API_KEY` / `EMAIL_FROM`  | Verified Resend sender and environment-appropriate key; do not enable broad production recipients during smoke tests                   |
| `OFFICE_EMAIL`                   | Approved internal recipient for new-request emails; omit until office delivery has been tested                                         |
| `TURNSTILE_SECRET_KEY`           | Server-side Cloudflare Turnstile secret; production intake fails closed without it                                                     |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Browser widget site key; must be present at build time and allow the staging/production hostname                                       |
| `TRUST_PROXY`                    | `true` only after verifying the ingress overwrites untrusted `x-forwarded-for`; otherwise leave `false`                                |

Public `NEXT_PUBLIC_*` values are browser-visible and can be embedded at build time. Rebuild when changing them. Secrets must remain server-only. Do not define a dummy credential just to bypass setup checks.

## Worker service

The outbox needs an actual worker; loading the dashboard does not send queued email or evaluate SLA timers.

Deploy a second service from the same image, with the same database/auth URL and email settings. Override the start command to:

```text
pnpm worker:loop
```

This worker executes a batch every 15 seconds, retries failures, and handles termination. Disable the web healthcheck and web port/domain for the worker service; its process does not expose HTTP. Do not copy the web start/healthcheck settings unchanged. Ensure only trusted operators can alter event payloads or read pending reset/approval links.

For a finite scheduled batch instead, run `pnpm worker` on an external scheduler with an appropriate interval; the command exits after its batch and database disconnect. Railway has platform-specific scheduling intervals and requires scheduled processes to exit; inspect its current constraints before choosing a cron frequency. [Railway cron jobs](https://docs.railway.com/cron-jobs).

Monitor failed events in the owner’s `/app/help` log and infrastructure alerts. There is no UI for retrying terminal failures yet; investigate the cause and use an authorized maintenance action rather than silently resetting attempts in a loop. Email delivery is not confirmed until a configured test recipient receives a real message and provider delivery events are inspected.

## Integration readiness

**Better Auth:** sign-in, sign-out, active-user access, hashing, session handling, and server role checks were tested locally. Password reset enqueueing is implemented but the full mailbox flow is untested without Resend credentials. Public signup is disabled. Use HTTPS for secure cookies; origin checks reject mutations from a different hostname. The app does not implement MFA yet. [Better Auth Next.js integration](https://better-auth.com/docs/integrations/next).

**Resend:** an actual HTTP adapter is implemented with timeout, a stable idempotency key, retry/backoff, and failure records. The development environment contains no provider key. Confirm domain verification, reply/support address, recipient limits, delivery, bounce processing, and access to failure logs before enabling it. Estimates and reset messages are transactional; there are no promotional campaigns in this release.

**Turnstile:** wire both keys, allow the correct hostname, and test a successful challenge and a rejected token against the deployed form. Server verification must remain enabled for public production intake. A configured secret alone is not proof the widget was configured or tested.

**Stripe/Twilio/object storage/maps:** not implemented operationally. Environment placeholders reserve names only. Before adding Stripe, use real test-mode checkout, verify signed raw-body webhook payloads, persist event idempotency, reconcile amounts/currency/invoice ownership, and test partial payments/refunds and replayed/out-of-order events. No current endpoint can claim payment success or collect card information. SMS needs consent/suppression/STOP handling; files need private signed access and validation; maps need verified addresses and scoped provider keys.

## Backups, monitoring, and release gates

- Enable managed PostgreSQL backups and set recovery-point/recovery-time objectives. Restore a backup into an isolated database and verify auth, estimates, and jobs before handling real business records. No backup is claimed to have been created by this task.
- Restrict production database access. Migrations should use an appropriate migration role; application credentials should not have unrelated administrative privileges. Encrypt remote transport and storage according to provider configuration.
- Keep raw customer details, reset/approval URLs, and secrets out of request logs and error tracking. Current application errors log only a failure class; centralized monitoring is still to be integrated.
- Review queue failures, worker health, repeated auth failures, response latency, database connection pool saturation, and storage growth. Add alert delivery and retention policies.
- Run the domain/database/browser tests in staging with disposable test data and separate provider credentials. Browser tests are development-only and must not create fictional records in the live business database.
- Complete the unfinished acceptance scenarios, password-reset delivery, production bot verification, permission review, financial/integration tests, retention controls, and a security review before relying on the system for the entire business.
- Keep `noindex`/robots restrictions on the app preview. A public SEO migration requires the independent content/URL verification in `BUSINESS-AUDIT.md` and explicit approval to change the live domain.

## Rollback

Keep previous deployment images and verified database recovery points. Roll back application code only when its schema expectations remain compatible. Do not automatically reverse data migrations or delete operational records. For a failed migration, stop the rollout, inspect the failure, recover in an isolated environment, and use an explicit corrective migration. Keep the existing public website running until the new platform has met the launch requirements.
