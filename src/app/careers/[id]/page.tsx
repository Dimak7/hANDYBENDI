import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PublicHeader, PublicFooter } from "@/components/public-shell";
import { CareerApplication } from "@/components/career-application";
import { countryName, payLabel } from "@/lib/hiring-display";
export const dynamic = "force-dynamic";
export const metadata = { title: "Job application | HandyBandi" };
export default async function Career({ params }: { params: Promise<{ id: string }> }) {
  const o = await db.hiringOpening.findFirst({
    where: { id: (await params).id, published: true, active: true },
  });
  if (!o) notFound();
  return (
    <div className="public-page">
      <PublicHeader />
      <main className="career-layout" id="main">
        <Link href="/careers">← All openings</Link>
        <div className="career-detail">
          <section>
            <div className="eyebrow">
              {countryName(o.country)} · {o.workplace.toLowerCase()}
            </div>
            <h1>{o.title}</h1>
            <p>
              {o.city} · {payLabel(o)}
            </p>
            <p className="hiring-prewrap">{o.description}</p>
            <h2>Role requirements</h2>
            <ul>
              {o.requiredSkills.map((s) => (
                <li key={s}>{s}</li>
              ))}
              {o.minimumYears > 0 && <li>{o.minimumYears}+ relevant years of experience</li>}
              {o.requiredAvailability.length > 0 && <li>{o.requiredAvailability.join(", ")}</li>}
            </ul>
            <p>
              Your application is reviewed by the hiring team. Submitting an application does not
              create a job offer.
            </p>
          </section>
          <CareerApplication
            openingId={o.id}
            country={o.country}
            language={o.language}
            questions={o.questions}
            requiredSkills={o.requiredSkills}
          />
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
