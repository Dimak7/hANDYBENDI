# Architecture and data contracts

## Request path

The App Router renders database-backed pages on the server. Client components handle forms and call REST routes under `/api`. Zod validates each mutation at the boundary. Protected routes obtain a Better Auth session, load the current active user from PostgreSQL, and check the required capability. UI visibility is a convenience; it is not the authorization boundary.

`src/lib/workflows.ts` owns intake, CRM edits, estimate creation/sharing/approval, note history, token hashing, and public rate limiting. `src/lib/jobs.ts` owns conversion, team assignment, conflict checks, and valid job transitions. UI pages do not implement a second copy of these business rules. `src/lib/worker.ts` consumes the transactional outbox and evaluates response SLAs.

Authentication is an exception to the application route wrappers: Better Auth’s own handler validates credentials, manages password hashing/reset tokens/sessions, enforces its trusted-origin policy, and uses persistent rate-limit storage. App queries separately recheck `User.active`; disabling a user therefore blocks existing sessions immediately.

## Shared data

The schema includes auth users/accounts/sessions/verifications, customers and commercial accounts, properties/buildings/units/property access, consent evidence, configurable pipeline labels, leads/activities/services, estimates/items/approvals, employees/skills/availability/certifications, jobs/tasks/assignments/status history, time entries, invoices/items/payments/refunds/expenses, warranty claims, notifications/outbox events/audits/settings.

These are not all the models required by the final brief. Inventory, purchase orders, marketing templates/campaigns, work orders/contracts/maintenance plans, documents/photo storage, compensation/timesheets, estimate versions/change orders, and expanded contact structures need further normalized migrations as their vertical slices are built. Role names are a PostgreSQL enum and the initial capability matrix is code; dynamic Role/Permission records are still planned.

Foreign keys and indexes protect ownership links and common status/customer/date queries. Unique constraints protect customer email, lead submission keys, one job per estimate, token hashes, payment provider IDs, and event dedupe keys. SQL check constraints validate positive quantities, nonnegative money, matching line totals, estimate/invoice arithmetic, paired schedule times, and time-window order. Tax is explicitly configured in each estimate; no jurisdictional tax decision is inferred by this application.

Every operational mutation uses a transaction with its audit/activity writes. There is no public endpoint for bulk customer, employee, or ledger data. CSV exports require the corresponding internal capability and escape formula prefixes. Read-only directory and finance pages are clearly marked where editing workflows are unfinished.

## Isolation

Internal staff receive broad company capabilities appropriate to their roles. This is a **single HandyBandi organization**, not a multi-tenant SaaS host with multiple independent handyman companies.

Customers must have `User.customerId` set by an authorized operator; matching email alone never grants access. Property managers need individual `PropertyAccess` rows. The portal derives authorized property IDs and applies them separately to property, job, and estimate queries. Filtering only the parent customer would leak that customer’s other buildings, so the nested property list is also filtered.

Technicians query jobs through `JobAssignment.employee.userId`; the status service repeats that ownership check on mutation. Employee compensation is not exposed in the team directory or technician response. A future compensation module must have a separate privileged capability and projection.

## Idempotency and concurrent writes

- Public requests carry an unguessable submission UUID; a unique constraint prevents double creation. A duplicate response contains only the request reference. Existing customer profiles are never overwritten from an unauthenticated form; submitted contact/context stays in the new request description.
- Leads carry an incrementing version; updates compare the expected version and reject stale changes.
- Sharing a draft conditionally advances it to sent and records only a hash of a 256-bit approval token. The plain link exists in the immediate staff response and, if configured, the pending restricted email payload; delivered payloads are redacted.
- Approval conditionally changes sent → approved while checking expiry, then writes the signature, CRM state, audit, and notifications. Concurrent/repeated approval cannot create duplicate approval records.
- Job creation locks the approved estimate, then returns its existing job or creates exactly one. A unique estimate relation provides a second guard.
- Assignment locks the job and each selected employee in stable order, then checks assignments whose `[start,end)` overlaps the proposed window extended by the travel buffer. All application scheduling writers follow this path. Reassignment is transactional. Existing closed/canceled jobs do not block slots.
- The worker claims email rows with `FOR UPDATE SKIP LOCKED`, leases them, retries after failures, and uses a stable Resend idempotency key. Provider delivery is not claimed to be exactly once beyond the provider’s idempotency guarantees. SLA alerts have unique event dedupe keys and are written in the same transaction as internal notifications.

The direct database credential can bypass application workflows. Production should use restricted database roles, restrict administrative access, and consider database exclusion constraints for assignment windows if additional scheduling writers are introduced.

## Status and pricing rules

Lead status is shared across the CRM, queries, and audit. Stage labels can be renamed without inventing incompatible status strings. Customer estimate approval controls the approved lead stage; an administrator cannot simply select it before an approved estimate exists. Scheduled/in-progress/completed lead states require a linked job.

The job state machine follows assigned → accepted → traveling → arrived → in progress → completed → signed off → closed, with an explicit waiting-for-approval branch and restricted cancellations. Technicians cannot record customer sign-off, close, or cancel a job. Dispatch sign-off currently records supporting notes, not a captured customer signature. The approved amount has no technician editing endpoint; additional scope must wait for a future change-order implementation.

Website prices are unverified starting references. Intake never calculates a promised price. Existing estimate terms are stored on each estimate, so later business setting changes cannot silently change an approved contract. Catalog prices, minimum charges, and emergency fees do not automatically become line items; office review is required.

## Report definitions

The redesigned Home metrics and open-item calculations are defined in [CRM-REDESIGN.md](CRM-REDESIGN.md) and implemented in `src/lib/home-data.ts`. Chicago calendar periods use `src/lib/dates.ts`. Completed job counts now use recorded completion transitions rather than the start-time cohort.

The Reporting page continues to show gross/net collections, issued invoice value, recorded expenses, estimate conversion, and payment transactions for its selected range. Invoice value includes non-draft invoices created in range; net collections subtract refunds issued in range from payments received in range. Recorded expenses do not yet include a complete labor or inventory allocation model. No profit margin or payroll liability is inferred.

## Growth and known limits

List screens currently cap displayed rows (150–250), and exports cap at 10,000. Add cursor pagination, database search indexes, export jobs, and date-range limits before large-scale data import. Day scheduling supports one continuous appointment window per job; multi-day/recurring jobs need a separate Booking/CalendarEvent model. Public request address screening uses ZIP prefixes, not verified geocoding.

Audit records are append-only through the app, but they are not immutable against database administrators. Central error reporting, retention/deletion controls, signed document access, MFA, broader CSRF/CSP testing, and automated backup/restore verification are still required for production.
