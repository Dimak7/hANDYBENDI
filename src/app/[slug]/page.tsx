import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { PublicHeader, PublicFooter } from "@/components/public-shell";
import { audiences, neighborhoods, phone, phoneHref } from "@/lib/public-content";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
const titles: Record<string, string> = {
  about: "Good work starts with a clear plan.",
  pricing: "Know the scope. Know the price.",
  "before-after": "Real work. From the project files.",
  "service-areas": "Chicago. Your side of the street.",
  contact: "Tell us what needs doing.",
  reviews: "Hear it from the people we help.",
};
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return {
    title: audiences[slug]?.title || titles[slug] || "Page not found",
    description:
      audiences[slug]?.intro ||
      "HandyBandi handyman services for Chicago homes, apartments and commercial spaces. Request a written quote.",
  };
}
export default async function PublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const audience = audiences[slug];
  if (!audience && !titles[slug]) notFound();
  const settings =
    slug === "pricing"
      ? await db.businessSettings.findUniqueOrThrow({ where: { id: "business" } })
      : null;
  const services = settings?.pricingVerified
    ? await db.service.findMany({
        where: { active: true, reviewRequired: false, startingPriceCents: { not: null } },
        orderBy: { name: "asc" },
      })
    : [];
  return (
    <div className="public-page">
      <PublicHeader />
      <main id="main">
        <section className="site-wrap site-inner-hero">
          <div className="site-kicker">{audience?.eyebrow || "HANDYBANDI · CHICAGO"}</div>
          <h1>{audience?.title || titles[slug]}</h1>
          <p>
            {audience?.intro ||
              {
                about:
                  "Small repairs, apartment projects, and business maintenance. HandyBandi brings your task list, written scope, and appointment details together.",
                pricing:
                  "Every repair list is different. Share yours and receive a written estimate before agreeing to the work.",
                "before-after":
                  "These project photographs come from HandyBandi’s existing published portfolio. They show actual portfolio examples, not generated work.",
                "service-areas":
                  "HandyBandi works across Chicago and nearby suburbs. Enter your service address in your request, and the office confirms coverage and availability.",
                contact:
                  "Start a repair list online or speak to the office. Your preferred date is a request until your appointment is confirmed.",
                reviews:
                  "We don’t invent ratings or reviews. Explore customer feedback on the existing HandyBandi website, and ask the office about your project.",
              }[slug]}
          </p>
          <div className="site-actions">
            <Link
              href={`/request-quote${audience?.commercial ? "?type=COMMERCIAL" : ""}`}
              className="button primary"
            >
              {audience?.commercial ? "Discuss your property" : "Build your repair list"}
              <ArrowUpRight size={17} />
            </Link>
            <a href={phoneHref} className="site-call">
              {phone}
            </a>
          </div>
        </section>
        <section className="site-wrap site-content">
          {audience && (
            <>
              <div className="site-editorial-rows">
                {audience.items.map(([title, body]) => (
                  <article key={title}>
                    <h2>{title}</h2>
                    <p>{body}</p>
                  </article>
                ))}
              </div>
              {audience.commercial && (
                <>
                  <h2>Made for your kind of space.</h2>
                  <div className="site-related">
                    {[
                      "offices",
                      "retail",
                      "restaurants",
                      "condo-associations",
                      "apartment-buildings",
                      "landlords",
                      "property-management",
                    ]
                      .filter((s) => s !== slug)
                      .map((s) => (
                        <Link href={`/${s}`} key={s}>
                          {audiences[s].eyebrow.toLowerCase()}
                        </Link>
                      ))}
                  </div>
                </>
              )}
            </>
          )}
          {slug === "about" && (
            <>
              <h2>The jobs that make your place feel better.</h2>
              <p>
                A sticking door, furniture that needs assembling, a wall that needs attention.
                HandyBandi’s work begins with the details: what needs doing, what the space allows,
                and what you expect from the visit.
              </p>
              <div className="site-editorial-rows">
                <article>
                  <h3>A written scope</h3>
                  <p>Review the work and estimate before agreeing to the job.</p>
                </article>
                <article>
                  <h3>Your building matters</h3>
                  <p>
                    Share access, COI requirements, parking, surfaces, and preferred hours so the
                    office can plan properly.
                  </p>
                </article>
              </div>
              <Link href="/services" className="site-text-link">
                Find your service
                <ArrowUpRight size={16} />
              </Link>
            </>
          )}
          {slug === "pricing" && (
            <>
              {settings?.pricingVerified ? (
                <>
                  <h2>Confirmed starting prices</h2>
                  {services.map((s) => (
                    <div key={s.id} className="site-pricing-row">
                      <Link href={`/services/${s.slug}`}>{s.name}</Link>
                      <strong>From {money(s.startingPriceCents!)}</strong>
                    </div>
                  ))}
                  <p>
                    Minimum visit: {money(settings.minimumVisitCents)}. Starting prices are not a
                    quote for your particular project.
                  </p>
                </>
              ) : (
                <>
                  <h2>Your list deserves its own estimate.</h2>
                  <p>
                    Published prices on the current website are under review for this new platform.
                    The office will confirm the applicable minimum, labor, materials, and any
                    emergency charge in your written estimate.
                  </p>
                </>
              )}
              <h2>What helps us quote clearly?</h2>
              <ul>
                <li>The number and type of tasks</li>
                <li>Photos, dimensions, and product details</li>
                <li>Parts you already have and materials you need</li>
                <li>Building access and working hours</li>
              </ul>
            </>
          )}
          {slug === "before-after" && (
            <div className="site-photo-grid">
              <figure>
                <Image
                  src="/images/gazebo-project.webp"
                  width={1024}
                  height={1024}
                  alt="HandyBandi published gazebo installation before and after"
                />
                <figcaption>Gazebo installation · original published portfolio</figcaption>
              </figure>
              <figure>
                <Image
                  src="/images/drain-project.webp"
                  width={1024}
                  height={1024}
                  alt="HandyBandi published drain work before and after"
                />
                <figcaption>
                  Drain installation and cleaning · original published portfolio
                </figcaption>
              </figure>
              <a href="https://handybandi.com/our-projects/" className="site-text-link">
                Explore the existing project archive
                <ArrowUpRight size={16} />
              </a>
            </div>
          )}
          {slug === "service-areas" && (
            <>
              <h2>From the North Side to nearby suburbs.</h2>
              <div className="site-neighborhoods">
                {neighborhoods.map((n) => (
                  <span key={n}>{n}</span>
                ))}
              </div>
              <p>
                Coverage is confirmed by the office for your address and type of work. Outside these
                neighborhoods? Call {phone} to discuss your location.
              </p>
              <p>
                We’re preserving the existing neighborhood guides during staging.{" "}
                <a href="https://handybandi.com/">
                  See the current website for the full location archive.
                </a>
              </p>
            </>
          )}
          {slug === "contact" && (
            <>
              <h2>A real conversation helps.</h2>
              <p>
                <a href={phoneHref}>{phone}</a>
                <br />
                <a href="mailto:office@handybandi.com">office@handybandi.com</a>
              </p>
              <p>
                For urgent work, call the office. Online requests are reviewed before scheduling;
                submitting a request does not reserve a slot or take a payment.
              </p>
              <Link href="/request-quote" className="site-text-link">
                Start your service request
                <ArrowUpRight size={17} />
              </Link>
            </>
          )}
          {slug === "reviews" && (
            <>
              <h2>Real feedback belongs to real people.</h2>
              <p>
                Verified review importing is not connected in this staging release. We’re keeping
                ratings and testimonials out until they can be attributed to their original source.
              </p>
              <a className="site-text-link" href="https://handybandi.com/">
                Read feedback on the current website
                <ArrowUpRight size={17} />
              </a>
            </>
          )}
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
