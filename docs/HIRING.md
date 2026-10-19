# Hiring in one HandyBandi workspace

The landing page now groups job posts by country and city, with filters for location, position title, and open/closed status. Counts reflect the filtered posts. Click any position card to see that post's applicants and top-three shortlist. Use **All applicant profiles** for the combined inbox. **Hiring** is directly accessible in the main navigation.

Open **Employees → Applicants & hiring** at `/app/employees/applicants`. Only active owners and managers can access applicant data, imports, publication controls, or the cross-market inbox. Each API checks permissions on the server.

## United States and Kazakhstan

Create an opening with its hiring market (US or KZ), city, on-site/hybrid/remote arrangement, USD or KZT pay range and hourly/monthly/yearly period. The form defaults to Chicago/USD/hour/English for the US and Almaty/KZT/month/Russian for Kazakhstan; these are editable defaults, not confirmed company vacancies. Up to five unique custom screening questions can be added. Public form labels support English, Russian and Kazakh; role descriptions and custom questions retain the language entered by staff.

Openings start as private drafts. **Publish to careers page** makes an active opening available at `/careers/[id]` and on `/careers`. Unpublish removes the listing; close also stops application intake. Reopening returns it to a draft. Existing applicants remain available when an opening closes. Publication and intake use a row lock to serialize closure against submissions. Editing an existing opening's criteria is not yet implemented.

## Applications and profiles

Candidates apply without a workspace login. Their contact information, country/city, structured skills, experience, availability, pasted resume text, screening answers and timestamped application consent are stored in PostgreSQL. The application form explains that the hiring workspace is hosted in the US and provides a correction/deletion contact. Before collecting real Kazakhstan applicants, the employer must confirm their privacy notice and cross-border data handling requirements. Staging remains fictional testing only.

Public intake checks origin, bounded request size, a honeypot, persistent rate limits, and Turnstile in production. Staging uses official Turnstile test keys, not production bot protection. Duplicate email addresses within an opening return the same generic acknowledgement without disclosing or overwriting a saved profile, stage, notes, or screening answers. Candidates may apply to different openings. There are no fabricated applicant profiles.

**All markets · applicant inbox** opens `/app/employees/applicants/inbox`, with country, opening, source, stage, and name/email filters. It includes closed openings and paginates 50 profiles at a time. Country is the applicant's residence; opening market is separate. Candidate location and language do not enter the ranking calculation.

Each opening retains its top three active candidates and full searchable profile table. Profile editors support new, screening, interview, offer, hired, rejected and withdrawn stages with stale-write protection. Hiring a candidate records an outcome; it does not provision an employee login. Applicants' screening answers, consent, source, and activity are visible only in the authorized workspace.

## Match calculation

Skills contribute 60%, relevant experience 25%, availability 15%. Labels use trimmed, case-insensitive exact matches. Experience is capped at the opening minimum. Unused criteria are excluded and remaining weights rescaled. At least one criterion is required. Resume prose, screening answers, names, contact details, country, source and notes do not enter the score. Claims require staff verification; the shortlist does not decide whom to hire. Ties share a rank with stable display ordering.

## External sources: actual status

The **Job boards & publishing** page at `/app/employees/hiring-connections` explicitly distinguishes the working careers intake from disconnected external services.

- HandyBandi careers publication and application intake: implemented.
- hh.kz employer account: the user says their client has one; account access is not verified or connected here.
- hh.kz developer registration, approved API access, OAuth, encrypted tokens, vacancy publishing and applicant synchronization: not implemented or tested.
- Indeed and LinkedIn employer/partner integrations: not connected, implemented or tested.
- Recruiting-provider subscription: none purchased.
- No external job advertisement has been published, and no job-board charges have been incurred by these changes.

Staff can currently create a board posting manually and include the published careers application link. Candidates using it enter this workspace directly. The source question is applicant-reported and is labeled as such, not represented as verified API attribution.

## CSV import

Inside an active opening, expand **Import applicants from a job board**. Convert an authorized board export to these columns:

```csv
name,email,phone,country,city,skills,years,availability,experience,resume
```

Required columns: name, email, phone, experience. Country uses US/KZ; omitted country defaults to the opening market. Use semicolons for multiple skills or availability values (Weekdays;Evenings;Weekends). Up to 100 records and 24,000 characters per request, also subject to the API's 32 KB JSON limit. Quoted commas, escaped quotes and embedded newlines are supported. Unexpected/duplicate headers and malformed CSV are rejected. Row-level validation reports imported, duplicate, and invalid results; already imported rows are safely skipped if retried. Imports retain the selected board source and audit actor. Existing profiles are never overwritten. This is manual intake, not an automatic sync or a guarantee that every board provides exports.

## Verification

Domain tests validate weighted scoring and CSV parsing. Isolated PostgreSQL tests cover draft/published/closed gating, consent, question validation, concurrent duplicate applications, preserved profiles, and existing workflow behavior. Browser tests cover US/KZ openings, public applications, private screening answers, cross-market filters, duplicate-safe imports, permission enforcement, and mobile/tablet/desktop layouts. No external integration is claimed to be verified.
