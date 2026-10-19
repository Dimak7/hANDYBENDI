import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PublicHeader, PublicFooter } from "@/components/public-shell";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Handyman services in Chicago",
  description:
    "Explore HandyBandi home repairs, furniture assembly, TV mounting, and maintenance. Add multiple services to one repair list.",
};
export default async function Services() {
  const services = await db.service.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  return (
    <div className="public-page">
      <PublicHeader />
      <main id="main">
        <section className="site-wrap site-inner-hero">
          <div className="site-kicker">WHAT NEEDS DOING?</div>
          <h1>
            One small job.
            <br />
            Or the whole list.
          </h1>
          <p>
            Pick the service you need. A few different things? Add them all to one request and the
            office will review the complete scope.
          </p>
          <Link href="/request-quote" className="button primary">
            Build your repair list
            <ArrowUpRight size={18} />
          </Link>
        </section>
        <section className="site-wrap site-content">
          <div className="site-service-list">
            {services.map((s, i) => (
              <Link key={s.id} href={`/services/${s.slug}`}>
                <span className="site-service-number">0{i + 1}</span>
                <div>
                  <h3>{s.name}</h3>
                  <p>{s.description}</p>
                </div>
                <ArrowUpRight size={22} />
              </Link>
            ))}
          </div>
          <div className="site-related">
            <Link href="/residential">For your home</Link>
            <Link href="/commercial">For your business</Link>
            <Link href="/property-management">For property managers</Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
