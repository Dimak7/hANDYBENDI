# Read-only business and website audit

Reviewed October 18, 2026. The live site was inspected with page retrieval and a read-only HTML/CSS inventory. Nothing was submitted to its forms or changed on its server. Prices, licensing statements, testimonials, staffing claims, warranties, and availability are source claims requiring owner verification, not independently verified business facts.

## Brand and user experience

The live stylesheet defines charcoal `#313A3C`, coral `#F35355` with hover `#DA4A4C`, cream `#F6F3EC`, white surfaces, Inter headings, and Manrope body text. The existing black transparent logo, fonts, and practical local service voice informed the preview. The operations app uses a distinct compact wordmark treatment; the public header retains the actual logo.

Navigation includes deep service pages, commercial/property-management pages, pricing, portfolio, blog, about, FAQs, careers, and contact. Forms recur across pages and accept residential/commercial selection, contact/address fields, and notes. The new intake separates optional service SMS consent from optional email marketing instead of making promotions a condition of submitting a request. [Homepage](https://handybandi.com/), [contact](https://handybandi.com/contact/).

## Operational emphasis

The website emphasizes written task estimates, combining small jobs into a visit, local housing conditions, short response targets, workmanship cover, building COIs, and vetted workers. The preview preserves the written-scope approach while treating appointment requests as unconfirmed until office review. It does not republish staffing totals, satisfaction percentages, licensing guarantees, or unconditional same-day availability. [Homepage](https://handybandi.com/).

Commercial content emphasizes vendor documentation, work around tenants/business hours, before/after reports, purchase-order references, agreed spending limits, and Net-30/per-site/consolidated billing. Those requirements informed account/property relations; most commercial contract and billing workflows are still unfinished. [Commercial services](https://handybandi.com/services/commercial/), [property management](https://handybandi.com/services/commercial/property-management-maintenance/).

The blog and portfolio contain detailed articles and visual project evidence. Careers provides a separate recruiting path. Those pages remain live and are linked to the existing site; they have not been replaced by generated summaries. [Blog](https://handybandi.com/blog/), [projects](https://handybandi.com/our-projects/), [careers](https://handybandi.com/careers/), [about](https://handybandi.com/about/).

## Conflicts requiring business decisions

| Topic                        | Observed disagreement / ambiguity                                                                                   | Implementation                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Materials                    | Homepage describes parts/hardware as included; pricing separately describes materials/parts and possible trip costs | Itemized estimate scope and terms snapshot; no automatic “all materials included” promise                     |
| Emergency and same-day       | General availability wording is conditional; pricing also associates same-day work with an emergency surcharge      | Configurable emergency fee; urgency never silently adds a charge or reserves a slot                           |
| Furniture assembly           | Main pricing starts at $140; the Lakeview page lists $50                                                            | Catalog reference starts at $140, remains unverified/editable, and is not shown as a guaranteed booking total |
| Hourly work                  | Main pricing says task-based pricing; Lakeview describes some larger carpentry/drywall as hourly                    | Office-written line items only; no automatic hourly/fixed quote promise                                       |
| Carpentry/drywall/appliances | Neighborhood and main rate tables show differing starting amounts                                                   | Editable per-service references; actual scope priced by office                                                |
| Commercial minimum           | Main commercial page lists $180; the property-management page lists $169                                            | Separate configurable commercial minimum, pending owner verification                                          |
| Turnovers                    | Main commercial/pricing pages list a starting amount; property-management content uses per-unit custom pricing      | Custom approval and per-property contracts required before commercial automation                              |
| Licensing                    | Broad specialist/technician claims sit alongside scope/permit limitations                                           | Regulated service flag plus recorded owner/manager review; no automatic assumption of compliance              |

Evidence: [pricing](https://handybandi.com/our-pricing/), [Lakeview](https://handybandi.com/services/handyman-in-lakeview-chicago/), [commercial](https://handybandi.com/services/commercial/), [property management](https://handybandi.com/services/commercial/property-management-maintenance/). The admin must explicitly mark imported pricing as reviewed. This flag does not validate the business’s legal or contractual compliance.

## SEO preservation policy

The new application runs separately. Root metadata is `noindex,nofollow`, and `robots.txt` disallows crawling. No DNS, redirects, live forms, published content, analytics tags, or sitemaps on the existing site were altered. The new homepage is a preview, not a migration of the existing SEO library.

`docs/seo-inventory.json` records inspected route URLs, final resolved URLs, titles, descriptions, canonical links, HTTP status, and discovered same-origin links. `scripts/audit-site.mjs` can refresh it. Raw source snapshots are stored only under ignored `artifacts/site-audit/`. This is a representative inventory, not an exhaustive SEO crawl.

Preserve these verified paths when a public migration is authorized:

- `/our-pricing/`
- `/services/furniture-assembly-in-chicago/`
- `/services/tv-mounting-in-chicago/`
- `/services/commercial/`
- `/services/commercial/property-management-maintenance/`
- `/services/handyman-in-lakeview-chicago/`
- `/our-projects/`, `/blog/`, `/about/`, `/contact/`, `/careers/`
- `/privacy-policy/`, `/terms-and-conditions/`

Before switching the public domain: obtain the full WordPress/export and sitemap inventory; migrate complete articles and service/area pages with their metadata, media/alt text, internal links, and structured data; create an explicit old-to-new 301 mapping only for changed URLs; compare canonicals, response codes, structured data, content coverage, image access, sitemap entries, and analytics configuration in staging; then authorize the domain switch. Do not redirect the existing SEO library to this abbreviated preview.
