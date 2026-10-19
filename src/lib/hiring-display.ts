export const countryName = (country: string) => (country === "KZ" ? "Kazakhstan" : "United States");
export function payLabel(o: {
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  salaryPeriod: string;
}) {
  if (o.salaryMin === null && o.salaryMax === null) return "Pay discussed during hiring";
  const money = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: o.currency,
      maximumFractionDigits: 0,
    }).format(n);
  return `${o.salaryMin !== null ? money(o.salaryMin) : "Up to"}${o.salaryMin !== null && o.salaryMax !== null ? " – " : " "}${o.salaryMax !== null ? money(o.salaryMax) : "+"} / ${o.salaryPeriod.toLowerCase()}`;
}
