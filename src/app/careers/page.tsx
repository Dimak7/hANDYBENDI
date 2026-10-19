import Link from "next/link";
import { db } from "@/lib/db";
import { PublicHeader, PublicFooter } from "@/components/public-shell";
import { countryName, payLabel } from "@/lib/hiring-display";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Careers | HandyBandi",
  description: "Explore HandyBandi opportunities in the United States and Kazakhstan.",
};
export default async function Careers({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const { country } = await searchParams;
  const openings = await db.hiringOpening.findMany({
    where: {
      published: true,
      active: true,
      ...(["US", "KZ"].includes(country || "") ? { country } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="public-page">
      <PublicHeader />
      <main className="career-layout" id="main">
        <div className="eyebrow">GROW WITH HANDYBANDI</div>
        <h1>
          Good people.
          <br />
          Work that matters.
        </h1>
        <p>
          Explore opportunities in the United States and Kazakhstan. Each opening lists its location
          and working arrangement.
        </p>
        <form className="hiring-filter">
          <label>
            Hiring market
            <select name="country" defaultValue={country || ""}>
              <option value="">All markets</option>
              <option value="US">United States</option>
              <option value="KZ">Kazakhstan</option>
            </select>
          </label>
          <button className="button secondary">View openings</button>
        </form>
        <div className="career-grid">
          {openings.map((o) => (
            <article className="card career-role" key={o.id}>
              <span className="eyebrow">
                {countryName(o.country)} · {o.workplace.toLowerCase()}
              </span>
              <h2>
                <Link href={`/careers/${o.id}`}>{o.title}</Link>
              </h2>
              <p>{o.city}</p>
              <p>{payLabel(o)}</p>
              <p>
                {o.description.slice(0, 220)}
                {o.description.length > 220 ? "…" : ""}
              </p>
              <Link className="button primary" href={`/careers/${o.id}`}>
                View role & apply
              </Link>
            </article>
          ))}
        </div>
        {!openings.length && (
          <section className="card">
            <h2>No published openings right now</h2>
            <p>Please check back for future opportunities.</p>
          </section>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
