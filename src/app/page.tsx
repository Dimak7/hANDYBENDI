import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, ArrowRight, Check, MapPin } from "lucide-react";
import { PublicHeader, PublicFooter } from "@/components/public-shell";
import { db } from "@/lib/db";
import { neighborhoods, phoneHref } from "@/lib/public-content";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Chicago handyman services | Your repair list, handled",
  description:
    "Build your repair list with HandyBandi. Home repairs, TV mounting, furniture assembly, and commercial maintenance in Chicago. Request a written quote.",
};
export const dynamic = "force-dynamic";
export default async function Home() {
  const services = await db.service.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  return (
    <div className="public-page">
      <PublicHeader />
      <main id="main">
        <section className="site-hero site-wrap">
          <div className="site-hero-copy">
            <div className="site-kicker">
              <span />
              YOUR NEIGHBORHOOD HANDYMAN. CHICAGO.
            </div>
            <h1>
              Life’s too short
              <br />
              for a{" "}
              <span>
                long
                <br className="hero-break" /> to-do list.
              </span>
            </h1>
            <p>
              The door that sticks. The shelf still in its box. The repairs taking up space in your
              head. Let’s get them off your list.
            </p>
            <div className="site-actions">
              <Link href="/request-quote" className="button primary">
                Build your repair list <ArrowUpRight size={19} />
              </Link>
              <a href={phoneHref} className="site-call">
                Or give us a call <ArrowUpRight size={14} />
              </a>
            </div>
            <div className="site-hero-promises">
              <span>
                <Check size={15} />
                Written estimates
              </span>
              <span>
                <Check size={15} />
                Multiple tasks, one request
              </span>
            </div>
          </div>
          <div className="site-hero-visual">
            <Image
              src="/images/handybandi-van.webp"
              alt="HandyBandi branded service vehicle on a Chicago residential street"
              width={768}
              height={1134}
              priority
              sizes="(max-width: 760px) 100vw, 48vw"
            />
            <div className="site-photo-label">
              <MapPin size={15} />
              CHICAGO, IL · LET’S GET TO WORK.
            </div>
            <div className="site-job-slip">
              <span>ON YOUR LIST?</span>
              <strong>
                Hang it.
                <br />
                Build it.
                <br />
                Fix it.
              </strong>
              <Link href="/services">
                We can help.
                <ArrowUpRight size={20} />
              </Link>
            </div>
          </div>
        </section>
        <div className="site-service-ribbon">
          <span>SMALL REPAIRS.</span>
          <span>GOOD CRAFTSMANSHIP.</span>
          <span>A SHORTER LIST.</span>
          <span>CONSIDER IT HANDLED.</span>
        </div>
        <section id="services" className="site-wrap site-services">
          <div className="site-section-head">
            <div>
              <div className="site-kicker">01 / WHAT NEEDS DOING?</div>
              <h2>
                Good with our hands.
                <br />
                Great for your weekend.
              </h2>
            </div>
            <p>
              One job or a whole collection of “I’ll get to it.” Find your service, add the details,
              and we’ll take it from there.
            </p>
          </div>
          <div className="site-service-list">
            {services.map((s, i) => (
              <Link href={`/services/${s.slug}`} key={s.id}>
                <span className="site-service-number">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{s.name}</h3>
                  <p>{s.description}</p>
                </div>
                <ArrowUpRight size={25} />
              </Link>
            ))}
          </div>
          <Link className="site-text-link" href="/request-quote">
            Got a few different jobs? Put them on one list.
            <ArrowRight size={18} />
          </Link>
        </section>
        <section className="site-audience">
          <div className="site-wrap">
            <div className="site-kicker">02 / YOUR PLACE. YOUR KIND OF HELP.</div>
            <h2>
              From the living room
              <br />
              to the storefront.
            </h2>
            <div className="site-audience-links">
              {[
                ["01", "Homes & apartments", "Make your place work better.", "/residential"],
                [
                  "02",
                  "Landlords & property managers",
                  "Keep the repair list moving.",
                  "/property-management",
                ],
                [
                  "03",
                  "Businesses & shared spaces",
                  "Less disruption. More getting on with it.",
                  "/commercial",
                ],
              ].map(([n, t, p, url]) => (
                <Link key={url} href={url}>
                  <span>{n}</span>
                  <div>
                    <h3>{t}</h3>
                    <p>{p}</p>
                  </div>
                  <ArrowUpRight />
                </Link>
              ))}
            </div>
          </div>
        </section>
        <section className="site-wrap site-process">
          <div className="site-section-head">
            <div>
              <div className="site-kicker">03 / NO GUESSWORK</div>
              <h2>
                A good fix starts
                <br />
                with a clear plan.
              </h2>
            </div>
            <Link href="/request-quote" className="button primary">
              Let’s start your list
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <ol>
            {[
              [
                "Show us the list",
                "Choose your services, describe each task, and add a few photos. One form for the whole job.",
              ],
              [
                "Know what you’re agreeing to",
                "The office reviews your request and prepares a written estimate. Scope, parts, and pricing are clear before work starts.",
              ],
              [
                "Make room for a better weekend",
                "We confirm your appointment and who’s coming. Your preferred date is a request until the office confirms it.",
              ],
            ].map(([t, p], i) => (
              <li key={t}>
                <span>0{i + 1}</span>
                <h3>{t}</h3>
                <p>{p}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className="site-wrap site-work">
          <div className="site-section-head">
            <div>
              <div className="site-kicker">04 / FROM THE HANDYBANDI PROJECT FILES</div>
              <h2>
                Real work.
                <br />
                Something to show for it.
              </h2>
            </div>
            <Link className="site-text-link" href="/before-after">
              See our work
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="site-work-grid">
            <figure>
              <Image
                src="/images/gazebo-project.webp"
                alt="Before and after gazebo installation from HandyBandi’s published project portfolio"
                width={1024}
                height={1024}
                sizes="(max-width: 760px) 100vw, 55vw"
              />
              <figcaption>
                <span>THE OUTDOOR LIST</span>
                <h3>A backyard, ready to enjoy.</h3>
                <p>Gazebo installation · from the HandyBandi portfolio</p>
              </figcaption>
            </figure>
            <figure>
              <Image
                src="/images/drain-project.webp"
                alt="Before and after drain installation and cleaning from HandyBandi’s published portfolio"
                width={1024}
                height={1024}
                sizes="(max-width: 760px) 100vw, 40vw"
              />
              <figcaption>
                <span>THE PRACTICAL DETAILS</span>
                <h3>Small fixes make a difference.</h3>
                <p>Drain work · from the HandyBandi portfolio</p>
              </figcaption>
            </figure>
          </div>
        </section>
        <section className="site-local">
          <div className="site-wrap">
            <div>
              <div className="site-kicker">05 / RIGHT HERE IN CHICAGO</div>
              <h2>
                Two-flats. Condos.
                <br />
                Your corner of the city.
              </h2>
              <p>
                Older plaster. Tight staircases. Building access rules. A city full of character
                comes with a particular kind of repair list. Tell us about yours.
              </p>
              <Link className="site-text-link" href="/service-areas">
                Check your service area
                <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className="site-neighborhoods">
              {neighborhoods.map((n) => (
                <span key={n}>{n}</span>
              ))}
              <p>Don’t see your area? Call the office to check.</p>
            </div>
          </div>
        </section>
        <section className="site-wrap site-faq">
          <div>
            <div className="site-kicker">A FEW THINGS YOU MIGHT BE WONDERING</div>
            <h2>
              Before we pick
              <br />
              up the toolbox.
            </h2>
          </div>
          <div>
            {[
              [
                "Can I put several repairs on one request?",
                "Yes. Choose every relevant service and describe each task. The office reviews the whole list and confirms the scope in writing.",
              ],
              [
                "Will I know the price before work starts?",
                "You receive a written estimate for review. Parts, access, scope changes, and additional charges need to be agreed before work.",
              ],
              [
                "Is my preferred date a confirmed booking?",
                "Your date helps the office plan. Your appointment is confirmed separately after scope and availability have been reviewed.",
              ],
              [
                "What about condo building requirements?",
                "Include access details, parking, work-hour restrictions, and COI requirements. The office will coordinate requirements with you.",
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <span>+</span>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="site-final">
          <div className="site-wrap">
            <div className="site-kicker">THAT THING YOU’VE BEEN MEANING TO FIX?</div>
            <h2>Let’s cross it off.</h2>
            <Link href="/request-quote" className="button">
              Build your repair list
              <ArrowUpRight size={22} />
            </Link>
            <a href={phoneHref}>(224) 486-3481</a>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
