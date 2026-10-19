# HandyBandi 2.0 public website

## Creative direction

Three directions were considered against the business brief:

| Direction                      | Visual language                                                                                  | Navigation and layout                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Chicago field notes — selected | Warm paper, charcoal, coral, restrained work-order yellow; Inter headlines and Manrope body copy | Numbered service rows, a job-list slip, real service vehicle photography, staggered original project photographs, separate B2B routes |
| Neighborhood workshop          | Forest green, natural cream, copper; serif-led storytelling                                      | Large documentary images, workshop-style section labels, service index and neighborhood stories                                       |
| City maintenance desk          | White, graphite, construction orange; condensed utilitarian typography                           | Compact service directory, architectural split layouts, commercial/property-maintenance emphasis                                      |

The selected direction carries the existing logo and recognizable coral into a custom local-service site. Photography comes from the existing HandyBandi website, never generated worker portraits or invented projects. Reviews and unverified starting prices are not fabricated.

## Working public routes

The homepage, service directory, all active database-backed service pages, residential, commercial, landlord, property-manager, office, retail, restaurant, condo-association and apartment-building routes work locally. About, contact, pricing review, service areas, and a two-project before/after portfolio are implemented. Existing blog and careers content remain linked to the current website. No duplicate neighborhood pages were generated.

The repair-list form progressively collects services/tasks/photos, contact/address, then preferences and consent. Back navigation retains entered fields. Additional tasks are stored in the lead description. Photo uploads support three JPEG/PNG/WebP files up to 5 MB each, with a bounded 16 MB multipart request. Server decoding checks format and pixel limits; re-encoding strips EXIF/GPS and emits WebP. Photos and lead records are linked transactionally. Objects written before a failed transaction or lost idempotent retry are cleaned up where possible. An interrupted process may leave an orphan object; automated object lifecycle cleanup remains an operational follow-up.

Private local development photos live outside `public/` in `.private-uploads`, ignored by Git and Docker. Production photos require configured private S3 storage; without it the photo input is hidden and forged upload attempts fail. Object storage keys are random; original filenames are not stored. Downloads proxy through a staff-only CRM permission check with `private, no-store`. Customer/technician downloads are not enabled. S3 requires a private bucket policy and backup/lifecycle configuration; local tests do not establish that cloud storage is configured.

## Source and content provenance

- Homepage, contacts, services, and portfolio: https://handybandi.com/ (reviewed 2026-10-19).
- Vehicle image: `https://handybandi.com/wp-content/uploads/2026/09/handybandi-brand-car-768x1134.webp`.
- Gazebo before/after: `https://handybandi.com/wp-content/uploads/2025/07/rsw_1160h_1160-3-1024x1024.webp`.
- Drain before/after: `https://handybandi.com/wp-content/uploads/2025/07/rsw_1160h_1160-1-1024x1024.webp`.
- Existing logo and locally hosted Inter/Manrope fonts retained from the earlier audit.

The photos were already presented as HandyBandi portfolio material on the owner’s website. No additional project location, date, worker identity, testimonial or performance number has been invented. Legal ownership/consent of the original media remains part of the owner’s launch content review.

## SEO and launch boundaries

Every new public page has a purpose-specific title and description. A sitemap includes public routes and active service slugs. Known audited pricing/portfolio/commercial and service URLs redirect to their matching routes. `/admin` and `/admin/recruitment` redirect into the existing single workspace. The full legacy URL inventory stays in `seo-inventory.json`; this limited redirect set is not a completed SEO migration. Staging retains noindex and robots blocking. No live domain, DNS record, or existing website has been changed.

## Remaining phases

Employee editing/timekeeping/payroll, marketing planning/attribution and provider tracking, hh.kz OAuth/sync, public careers intake, payment collection, commercial work orders, inventory, and advanced automations remain separate functional work. Current financial screens remain read-only. The new website does not represent these as completed services.

hh.kz status remains unconfirmed for account registration, employer verification, developer application, API access, OAuth connection, and data-sync testing. No vacancy has been published. Owner confirmation of recruitment country and hiring region is required before publishing.
