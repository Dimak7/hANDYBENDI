import { PublicHeader, PublicFooter } from "@/components/public-shell";
import { IntakeForm } from "@/components/intake-form";
import { db } from "@/lib/db";
import { photosEnabled } from "@/lib/photos";
export const dynamic = "force-dynamic";
export default async function RequestQuote({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; type?: string }>;
}) {
  const { service, type } = await searchParams;
  const services = await db.service.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return (
    <div className="public-page">
      <PublicHeader />
      <main className="quote-layout" id="main">
        <aside className="quote-intro">
          <div className="eyebrow">LET’S TAKE CARE OF IT</div>
          <h1>
            One request.
            <br />A shorter to-do list.
          </h1>
          <p>
            Tell us about your home or business and the tasks you have in mind. Our office will
            review your request and help with the next steps.
          </p>
          <a href="tel:+12244863481" className="button">
            (224) 486-3481
          </a>
          <div className="quote-steps">
            {[
              { title: "Tell us what you need", body: "One task or the whole list." },
              { title: "Get a written estimate", body: "Clear scope before work begins." },
              { title: "We confirm your visit", body: "A time and a team that fit the job." },
            ].map((s, i) => (
              <div className="quote-step" key={s.title}>
                <span>{i + 1}</span>
                <div>
                  <strong>{s.title}</strong>
                  <p>{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
        <IntakeForm
          services={services}
          selected={service}
          initialType={type === "COMMERCIAL" ? "COMMERCIAL" : "RESIDENTIAL"}
          allowPhotos={photosEnabled()}
        />
      </main>
      <PublicFooter />
    </div>
  );
}
