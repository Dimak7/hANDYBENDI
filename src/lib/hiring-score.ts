export const availabilityOptions = ["Weekdays", "Evenings", "Weekends"] as const;
export const applicantStatuses = [
  "NEW",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "HIRED",
  "REJECTED",
  "WITHDRAWN",
] as const;
export const normalizeTags = (values: string[]) => [
  ...new Set(values.map((v) => v.trim().toLowerCase()).filter(Boolean)),
];
type Criteria = { requiredSkills: string[]; minimumYears: number; requiredAvailability: string[] };
type Evidence = { skills: string[]; relevantYears: number; availability: string[] };
// Only structured job criteria enter the score. Names, contact details, notes and resume prose do not.
export function candidateFit(opening: Criteria, applicant: Evidence) {
  const required = normalizeTags(opening.requiredSkills);
  const actual = new Set(normalizeTags(applicant.skills));
  const matched = required.filter((s) => actual.has(s));
  const missing = required.filter((s) => !actual.has(s));
  const slots = normalizeTags(opening.requiredAvailability);
  const available = new Set(normalizeTags(applicant.availability));
  const matchedSlots = slots.filter((s) => available.has(s));
  const parts = [
    {
      label: "Skills",
      weight: 60,
      enabled: required.length > 0,
      ratio: required.length ? matched.length / required.length : 0,
    },
    {
      label: "Experience",
      weight: 25,
      enabled: opening.minimumYears > 0,
      ratio: opening.minimumYears ? Math.min(applicant.relevantYears / opening.minimumYears, 1) : 0,
    },
    {
      label: "Availability",
      weight: 15,
      enabled: slots.length > 0,
      ratio: slots.length ? matchedSlots.length / slots.length : 0,
    },
  ];
  const weight = parts.filter((p) => p.enabled).reduce((sum, p) => sum + p.weight, 0);
  return {
    score: weight
      ? Math.round(
          (parts.filter((p) => p.enabled).reduce((sum, p) => sum + p.weight * p.ratio, 0) /
            weight) *
            100,
        )
      : null,
    matched,
    missing,
    reasons: [
      required.length
        ? `${matched.length}/${required.length} required skills matched`
        : "No skill requirement set",
      opening.minimumYears
        ? `${applicant.relevantYears}/${opening.minimumYears} years of relevant experience`
        : "No experience minimum set",
      slots.length
        ? `${matchedSlots.length}/${slots.length} required availability windows matched`
        : "No availability requirement set",
    ],
  };
}
export function rankCandidates<T extends Evidence & { id: string; status: string }>(
  opening: Criteria,
  applicants: T[],
) {
  return applicants
    .filter((a) => !["HIRED", "REJECTED", "WITHDRAWN"].includes(a.status))
    .map((applicant) => ({ applicant, fit: candidateFit(opening, applicant) }))
    .filter((row) => row.fit.score !== null)
    .sort((a, b) => b.fit.score! - a.fit.score! || a.applicant.id.localeCompare(b.applicant.id));
}
