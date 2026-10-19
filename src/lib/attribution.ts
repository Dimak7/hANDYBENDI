export type Attribution = { utmSource?: string; utmMedium?: string; utmCampaign?: string };
export function attributionFromSearch(search: string): Attribution {
  const p = new URLSearchParams(search);
  const clean = (name: string, max: number) => p.get(name)?.trim().slice(0, max) || undefined;
  return {
    utmSource: clean("utm_source", 100),
    utmMedium: clean("utm_medium", 100),
    utmCampaign: clean("utm_campaign", 200),
  };
}
const key = "handybandi-attribution";
export function captureAttribution(search: string) {
  const a = attributionFromSearch(search);
  if (Object.values(a).some(Boolean))
    try {
      sessionStorage.setItem(key, JSON.stringify(a));
    } catch {
      /* Storage can be disabled. */
    }
  return a;
}
export function currentAttribution(search: string): Attribution {
  const a = captureAttribution(search);
  if (Object.values(a).some(Boolean)) return a;
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) || "{}");
    return attributionFromSearch(
      new URLSearchParams({
        utm_source: typeof saved.utmSource === "string" ? saved.utmSource : "",
        utm_medium: typeof saved.utmMedium === "string" ? saved.utmMedium : "",
        utm_campaign: typeof saved.utmCampaign === "string" ? saved.utmCampaign : "",
      }).toString(),
    );
  } catch {
    return {};
  }
}
