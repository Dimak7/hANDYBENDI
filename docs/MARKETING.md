# Marketing workspace

Open **Marketing** from the main menu or `/app/marketing`. Only active owners and managers have `marketing:read` and `marketing:write`. Server-side page and API guards enforce access; hiding a menu is not the access control.

## Analysis

The dashboard uses saved CRM requests and manual USD spend entries, not simulated ad-platform data. Choose the last 7, 30, or 90 Chicago calendar days, source, and campaign. Requests are grouped by normalized UTM source, falling back to their recorded source; campaigns use normalized UTM campaign. Sources and campaign labels are case insensitive. Every source/campaign pair retains a separate row, including spend with no matching requests.

- New requests: CRM leads created in the selected range.
- Approved requests: those leads with at least one approved estimate or linked job, counted once per lead. Later approvals change the cohort's result. This is not the number of unique customers acquired or completed jobs.
- Approval rate: approved requests divided by requests, or unavailable when no requests exist.
- Recorded spend: manually entered USD amounts dated in the selected range; unavailable when no spend is recorded, rather than implying zero ad costs.
- Cost per request: recorded spend divided by requests in the current view, rounded to cents. It is an estimate based on the entered figures and submitted attribution, not an audited ad-platform metric.

The dashboard provides source bars, campaign comparisons, expandable calculation definitions, manual-spend history and direct links to the underlying requests. The latest 100 requests are listed; totals include all requests in the selected view.

## Campaign links and attribution

The link builder creates URLs for the current environment's homepage, quote request, or commercial landing page. It adds source, medium, and campaign tags. Public navigation stores only these bounded tag fields in sessionStorage and carries them into submitted quote requests after navigation. A new explicitly tagged landing replaces the stored tags; untagged pages preserve them for the browser session. If storage is unavailable, tags on the current quote URL still work. Attribution is last tagged touch within one browser session, not cross-device tracking or independent proof of an advertising source. Existing historical leads cannot be retroactively attributed. Staging links point to staging and are for fictional testing only.

No Google Analytics, Google Ads, Meta Ads, Search Console, advertising spend API, click/impression feed, or revenue/ROAS integration is connected. These statistics are not displayed as if imported.

## Manual spend

**Record marketing spend** saves an amount already spent. It does not purchase advertising, schedule campaigns, or initiate payments. Use matching source and campaign names. Entries are in USD only and independent of the accounting expense ledger. Writes are validated and audited. A submission key and transaction-scoped lock prevent duplicate saves under concurrent retries without overwriting the saved amount. **Remove entry** corrects this analysis and records a deletion audit; it does not reverse a real payment or ad.

## Verification

Domain tests cover source/campaign aggregation, per-request approval counting, spend-only rows, permissions, and bounded tag extraction. Isolated database tests cover concurrent retries, preserved amounts, validation and audit records. Browser tests cover marketing totals, manual spend, cost per request, campaign link generation, mobile navigation, and end-to-end attribution from a tagged homepage into the CRM quote. Technician and anonymous API access are denied.
