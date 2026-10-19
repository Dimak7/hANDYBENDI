"use client";
import { useState } from "react";
import { SecurityCheck } from "./intake-form";
import { availabilityOptions } from "@/lib/hiring-score";
const labels = {
  en: {
    apply: "Apply for this role",
    name: "Full name",
    email: "Email",
    phone: "Phone",
    country: "Country of residence",
    city: "City",
    skills: "Skills (comma separated)",
    years: "Relevant years of experience",
    experience: "Relevant work experience",
    resume: "Resume / application text",
    consent:
      "I agree to share these details with HandyBandi’s hiring team for this application. My information will be stored in the company’s US-hosted hiring workspace. I can contact office@handybandi.com to request correction or deletion.",
    submit: "Submit application",
    received:
      "Application received. If you already applied, your existing application is unchanged.",
    availability: ["Weekdays", "Evenings", "Weekends"],
  },
  ru: {
    apply: "Откликнуться на вакансию",
    name: "Имя и фамилия",
    email: "Электронная почта",
    phone: "Телефон",
    country: "Страна проживания",
    city: "Город",
    skills: "Навыки (через запятую)",
    years: "Опыт работы (лет)",
    experience: "Релевантный опыт работы",
    resume: "Текст резюме / сопроводительное письмо",
    consent:
      "Я согласен(на) передать эти данные команде HandyBandi для рассмотрения отклика. Информация будет храниться в системе найма компании, размещённой в США. Для исправления или удаления данных: office@handybandi.com.",
    submit: "Отправить отклик",
    received: "Отклик получен. Если вы уже откликались, ваша предыдущая заявка не изменена.",
    availability: ["Будни", "Вечера", "Выходные"],
  },
  kk: {
    apply: "Вакансияға өтініш беру",
    name: "Аты-жөні",
    email: "Электрондық пошта",
    phone: "Телефон",
    country: "Тұратын ел",
    city: "Қала",
    skills: "Дағдылар (үтір арқылы)",
    years: "Тиісті жұмыс тәжірибесі (жыл)",
    experience: "Тиісті жұмыс тәжірибесі",
    resume: "Түйіндеме / өтініш мәтіні",
    consent:
      "Осы өтінішті қарау үшін деректерімді HandyBandi жұмысқа қабылдау тобына беруге келісемін. Деректер АҚШ-та орналасқан компанияның жұмысқа қабылдау жүйесінде сақталады. Түзету немесе жою үшін: office@handybandi.com.",
    submit: "Өтініш жіберу",
    received:
      "Өтініш қабылданды. Бұрын өтініш берген болсаңыз, алдыңғы өтінішіңіз өзгеріссіз қалады.",
    availability: ["Жұмыс күндері", "Кешкі уақыт", "Демалыс күндері"],
  },
};
export function CareerApplication({
  openingId,
  country,
  language,
  questions,
  requiredSkills,
}: {
  openingId: string;
  country: string;
  language: string;
  questions: string[];
  requiredSkills: string[];
}) {
  const [lang, setLang] = useState(language in labels ? (language as keyof typeof labels) : "en");
  const l = labels[lang];
  const [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState(""),
    [token, setToken] = useState(""),
    [securityKey, setSecurityKey] = useState(0);
  if (done)
    return (
      <section className="card" role="status">
        <h2>{l.received}</h2>
      </section>
    );
  return (
    <section className="card career-apply" lang={lang}>
      <label>
        Language / Язык / Тіл
        <select
          aria-label="Language / Язык / Тіл"
          value={lang}
          onChange={(e) => setLang(e.target.value as keyof typeof labels)}
        >
          <option value="en">English</option>
          <option value="ru">Русский</option>
          <option value="kk">Қазақша</option>
        </select>
      </label>
      <h2>{l.apply}</h2>
      <form
        className="hiring-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const f = new FormData(e.currentTarget);
          try {
            const res = await fetch("/api/careers/apply", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                openingId,
                name: f.get("name"),
                email: f.get("email"),
                phone: f.get("phone"),
                country: f.get("country"),
                city: f.get("city"),
                skills: String(f.get("skills") || "")
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
                relevantYears: Number(f.get("years")),
                availability: f.getAll("availability"),
                experience: f.get("experience"),
                resumeText: f.get("resumeText"),
                source: f.get("source"),
                answers: questions.map((_, i) => String(f.get(`answer-${i}`) || "")),
                consent: f.get("consent") === "on",
                website: f.get("website"),
                turnstileToken: token,
              }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || "Please try again.");
            setDone(true);
          } catch (err) {
            setError((err as Error).message);
            setToken("");
            setSecurityKey((k) => k + 1);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="hiring-form-grid">
          <label>
            {l.name}
            <input name="name" required minLength={2} maxLength={120} autoComplete="name" />
          </label>
          <label>
            {l.email}
            <input name="email" type="email" required maxLength={254} autoComplete="email" />
          </label>
          <label>
            {l.phone}
            <input
              name="phone"
              type="tel"
              required
              minLength={7}
              maxLength={40}
              autoComplete="tel"
            />
          </label>
          <label>
            {l.country}
            <select name="country" aria-label={l.country} defaultValue={country}>
              <option value="US">United States / США / АҚШ</option>
              <option value="KZ">Kazakhstan / Казахстан / Қазақстан</option>
            </select>
          </label>
          <label>
            {l.city}
            <input name="city" required maxLength={120} autoComplete="address-level2" />
          </label>
          <label>
            {l.years}
            <input name="years" type="number" min={0} max={60} required defaultValue={0} />
          </label>
        </div>
        <label>
          {l.skills}
          <input name="skills" maxLength={2000} placeholder={requiredSkills.join(", ")} />
        </label>
        <fieldset className="hiring-availability">
          <legend>Availability / Доступность / Қолжетімділік</legend>
          {availabilityOptions.map((s, i) => (
            <label key={s}>
              <input name="availability" type="checkbox" value={s} />
              {l.availability[i]}
            </label>
          ))}
        </fieldset>
        <label>
          {l.experience}
          <textarea name="experience" required minLength={10} maxLength={6000} />
        </label>
        <label>
          {l.resume}
          <textarea name="resumeText" maxLength={12000} rows={6} />
        </label>
        {questions.map((q, i) => (
          <label key={i}>
            {q}
            <textarea name={`answer-${i}`} required maxLength={2000} />
          </label>
        ))}
        <label>
          How did you find us? / Источник / Дереккөз
          <select name="source" aria-label="How did you find us? / Источник / Дереккөз">
            <option>Careers website</option>
            <option>hh.kz</option>
            <option>Indeed</option>
            <option>LinkedIn</option>
            <option>Referral</option>
            <option>Other</option>
          </select>
        </label>
        <div hidden aria-hidden="true">
          <label>
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <label className="career-consent">
          <input name="consent" type="checkbox" required />
          {l.consent}
        </label>
        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
          <SecurityCheck key={securityKey} onToken={setToken} />
        )}
        {error && (
          <p role="alert" className="hiring-error">
            {error}
          </p>
        )}
        <button
          className="button primary"
          disabled={busy || Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !token)}
        >
          {busy ? "…" : l.submit}
        </button>
      </form>
    </section>
  );
}
