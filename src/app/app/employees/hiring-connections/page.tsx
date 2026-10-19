import Link from "next/link";
import { requireUser } from "@/lib/session";
import { PageHeader, Badge } from "@/components/ui";
import { TeamTabs } from "@/components/team-tabs";
export default async function Connections() {
  await requireUser("hiring:write");
  return (
    <>
      <PageHeader
        title="Job boards & publishing"
        description="Create openings once. Publish on your careers page now; external boards become available after their employer connection is set up and verified."
      />
      <TeamTabs active="applicants" />
      <div className="hiring-toolbar">
        <Link className="button secondary" href="/app/employees/applicants">
          Openings & top 3
        </Link>
        <Link className="button secondary" href="/app/employees/applicants/inbox">
          All applicant profiles
        </Link>
      </div>
      <div className="career-grid">
        <section className="card hiring-profile">
          <Badge tone="green">Available</Badge>
          <h2>HandyBandi careers</h2>
          <p>
            Publish or unpublish each opening from the hiring workspace. Applications appear
            automatically in the shared inbox. English, Russian, and Kazakh form labels are
            available.
          </p>
          <Link className="button primary" href="/careers">
            View careers page
          </Link>
        </section>
        <section className="card hiring-profile">
          <Badge tone="slate">Not connected</Badge>
          <h2>hh.kz · Kazakhstan</h2>
          <p>
            Your client can keep their existing employer account. No credentials, vacancy data, or
            applicant profiles have been imported from it.
          </p>
          <ol>
            <li>The employer authorizes access to their company account.</li>
            <li>Register and obtain approval for the API application.</li>
            <li>
              Connect the authorized account for vacancy publishing and applicant synchronization.
            </li>
            <li>
              Verify a real vacancy and application round trip before enabling automatic posting.
            </li>
          </ol>
          <a href="https://dev.hh.ru/" target="_blank" rel="noreferrer">
            Official HeadHunter developer portal ↗
          </a>
        </section>
        <section className="card hiring-profile">
          <Badge tone="slate">Not connected</Badge>
          <h2>Indeed & LinkedIn · United States</h2>
          <p>
            No employer accounts are connected. Direct posting and application sync are unavailable
            until employer access and the relevant partner integration are approved and tested.
          </p>
          <p>
            For now, publish the careers listing and share its link in a job posting you create on
            the board. Applicants who use that link apply directly into this workspace.
          </p>
        </section>
        <section className="card hiring-profile">
          <Badge tone="blue">Available</Badge>
          <h2>Bring existing applicants together</h2>
          <p>
            Use the CSV import inside an opening to bring authorized exports from hh.kz or other
            boards into one list. Select the source to preserve attribution. Duplicate email
            addresses within the same opening are skipped without overwriting profiles.
          </p>
          <p>CSV import is manual; it does not activate posting or ongoing synchronization.</p>
          <Link href="/app/employees/applicants">Choose an opening to import</Link>
        </section>
      </div>
      <section className="card hiring-profile">
        <h2>Paid services</h2>
        <p>
          No recruiting subscriptions, sponsored postings, or job-board purchases have been
          activated. An established recruiting provider could add broader distribution later, once
          coverage and costs are confirmed.
        </p>
      </section>
    </>
  );
}
