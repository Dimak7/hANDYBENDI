# Housecall Pro inspired CRM update

This update adapts HandyBandi’s operations interface to the organization and interaction patterns shown in Housecall Pro’s public product pages and documentation. HandyBandi retains its own name, logo treatment, data, authentication, permissions, and business rules. No Housecall Pro login, customer data, proprietary source code, or product images are used in the application.

## References reviewed

- [Homepage overview](https://help.housecallpro.com/en/articles/6974306-homepage-overview-faq): open items, statistics, employee status, recent activity, and schedule.
- [Navigation](https://help.housecallpro.com/en/articles/6934643-navigating-housecall-pro): primary navigation, responsive menus, notifications, and quick creation.
- [Pipeline overview](https://help.housecallpro.com/en/articles/6185127-getting-started-with-pipeline): separate Leads, Estimates, and Jobs boards; filters and board/table views.
- [Customer list](https://help.housecallpro.com/en/articles/7939775-creating-reports-from-the-customer-list): sortable columns, filtering, column choices, and export.
- [Public pipeline product page](https://www.housecallpro.com/features/pipeline/): visual reference for compact lead cards, customer-first labels, unassigned employee indicators, and status menus.

## Implemented

- A dark horizontal primary navigation with Home, Schedule, Customers, Pipeline, Reporting, a permission-filtered More menu, search, notifications, account actions, and a New menu. Mobile navigation uses a drawer. Escape dismisses open header menus.
- Blue actions, compact neutral surfaces, clearer table density, and shared typography across operations pages. The public website keeps its separate HandyBandi brand theme.
- Home open-item cards use actual counts and balances. They link to filtered estimates, invoices, unscheduled jobs, and new leads. Business stats support Today, Week to date, Month to date, and Quarter to date.
- Employee status filters by a real employee and shows their assigned jobs. Schedule and recent lead/estimate activity are linked to their stored records. No simulated map, location, or employee status is shown.
- Pipeline includes Leads, Estimates, and Jobs boards, record search, owner/priority/status filters, board/table views, values by column, phone/email links, and detail links.
- Lead cards can be moved by their drag handle on desktop or by a status menu. Changes call the existing authorized, version-checked, transactional lead update service. Invalid approval or scheduling transitions remain blocked and display an error. Estimate and job board cards link to their full workflows rather than bypassing those workflows with unrestricted status edits.
- Customer lists include search, account-type filtering, sortable customer/job-count/created columns, persisted column visibility preferences, selection, filtered server CSV export, and selected-row CSV export. Only presentation preferences are stored in browser local storage; customer records remain in PostgreSQL.
- Related customer, lead, estimate, job, and invoice lists share navigation tabs where the user’s role permits access.

## Home metric definitions

Open items are current snapshots, independent of the stats date filter:

- Open estimates: unexpired drafts or sent estimates, with total estimate value.
- Open invoices: non-draft issued/paid ledger records with a positive net unpaid balance, after stored payments and refunds.
- Unscheduled jobs: jobs currently at UNASSIGNED, with agreed value.
- New leads: leads currently at NEW, with estimated pipeline value. A lead without an estimate contributes zero value.

Statistics use Chicago calendar boundaries through the end of the selected current day:

- Net collected: payments received minus refunds issued in the period.
- Jobs completed: recorded COMPLETED job transitions in the period.
- Average completed job: agreed job value across those completions divided by their count. This is not a collected-revenue or profit calculation.
- New jobs booked: jobs created in the period.
- Estimate conversion: currently approved estimates divided by estimates sent in the period.

The UI does not invent percentage-growth comparisons when there is insufficient comparison data. Existing financial features, provider integrations, and production readiness limitations in `STATUS.md` still apply. This redesign does not implement Housecall Pro’s entire feature set.

## Verification

The browser suite verifies the existing quote-to-job workflow, authenticated and anonymous permission boundaries, and mobile/tablet/desktop layouts. A dedicated CRM test creates a disposable request, moves it through a status menu and a real pointer drag, verifies PostgreSQL/audit persistence, checks the approval guard, verifies the estimate/job boards, tests column preference persistence, downloads selected customers, and checks filtered export behavior. Its own fixture is removed after the test.
