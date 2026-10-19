import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { db } from "@/lib/db";
import { serviceGuides, phoneHref } from "@/lib/public-content";
import { PublicHeader, PublicFooter } from "@/components/public-shell";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await db.service.findUnique({ where: { slug } });
  return { title: s ? `${s.name} in Chicago` : "Service not found", description: s?.description };
}
export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await db.service.findUnique({ where: { slug } });
  if (!service?.active) notFound();
  const guide = serviceGuides[slug];
  return (
    <div className="public-page">
      <PublicHeader />
      <main id="main">
        <section className="site-wrap site-inner-hero">
          <div className="site-breadcrumb">
            <Link href="/services">All services</Link> / {service.name}
          </div>
          <div className="site-kicker">{service.name.toUpperCase()} · CHICAGO</div>
          <h1>{guide?.headline || `${service.name}. Consider it handled.`}</h1>
          <p>{service.description}</p>
          <div className="site-actions">
            <Link className="button primary" href={`/request-quote?service=${service.id}`}>
              Add to your repair list
              <ArrowUpRight size={17} />
            </Link>
            <a className="site-call" href={phoneHref}>
              Talk to the office
            </a>
          </div>
        </section>
        <section className="site-wrap site-content">
          <div className="site-editorial-rows">
            <article>
              <h2>What’s on your list?</h2>
              <div>
                <ul>
                  {(
                    guide?.tasks || [
                      service.description,
                      "Multiple tasks reviewed together",
                      "Written scope and scheduling confirmation",
                    ]
                  ).map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            </article>
            <article>
              <h2>A few useful details</h2>
              <p>
                {guide?.prepare ||
                  "Include the task list, photos, access details, and preferred dates. The office will review the requirements and confirm the right next step."}
              </p>
            </article>
            <article>
              <h2>Before work starts</h2>
              <p>
                We review your request and prepare a written estimate. Materials, access
                requirements, scope changes, and scheduling are confirmed separately.{" "}
                {service.licensingReview
                  ? "This service requires licensing review. The office confirms whether an appropriately qualified provider is needed."
                  : "Tell us about unusual surfaces, building rules, or parts you already own."}
              </p>
            </article>
          </div>
          <h2>A few jobs, one request.</h2>
          <p>
            You can add other services before submitting. Your whole list will stay together in the
            office’s CRM.
          </p>
          <Link href="/services" className="site-text-link">
            Explore other services
            <ArrowUpRight size={17} />
          </Link>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
