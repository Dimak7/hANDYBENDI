# Applicants in the people workspace

Open **More → Applicants & hiring**, or **Employees → Applicants & hiring**. The route is `/app/employees/applicants` and uses the existing workspace login. Only active owners and managers can access applicant profiles or write hiring data; every server route checks this permission.

1. Create an opening with its role description and required skills, relevant years, and availability windows.
2. Add an applicant with contact details, skills, experience, availability, source, resume/application text, and internal notes. Profiles persist in PostgreSQL. Duplicate email addresses for the same opening are rejected; the same person may apply to another opening.
3. The opening shows the top three active candidates plus a searchable full applicant table. Every card and row opens the complete profile.
4. Edit profiles and advance them through new, screening, interview, offer, hired, rejected, or withdrawn. Inactive candidates remain searchable but leave the shortlist. Concurrent stale edits return a conflict instead of overwriting newer data. Creation and edits write audit records atomically.

## Match calculation

Skills contribute 60%, relevant experience 25%, and availability 15%. Skill and availability labels use trimmed, case-insensitive exact matches. Experience is capped at the opening’s minimum; extra years do not earn additional points. Unconfigured criteria are removed and the remaining weights rescaled. At least one criterion must be set when creating an opening. Each profile shows its match explanation and missing skills. Scores are calculated from current persisted fields, not stored AI assessments.

Names, email, phone, free-text experience/resume content, source, and internal notes do not enter the score. Recorded skills and years are claims that staff must verify. Equal scores share a rank, with stable record ID ordering for display; a notice appears if more applicants tie at the three-card boundary. Search and stage filters affect only the full list, not the shortlist.

## Current scope

There are no fabricated or automatically imported applicants. Staff enter or paste application data. Resume file uploads, automated parsing, public application intake, email/job-board integrations, interviews/calendar booking, and criteria editing/closing an opening in the UI remain future work. Profiles can be edited, and outcomes tracked. Marking a profile hired does not create an employee account: existing staff provisioning is still a separate step. All operational staff pages remain inside the same workspace.

## Validation

Domain tests cover normalization, weighted scoring, omitted criteria, experience caps, stable ties, inactive exclusion and role grants. Isolated PostgreSQL tests cover persistent profiles, duplicate application checks, stale versions, audit writes and closed-opening intake. Browser tests exercise opening/applicant entry, profile editing, shortlist replacement, search, permission enforcement and responsive layouts.
