export function chicagoMidnight(ymd: string, hour = 0) {
  const target = new Date(`${ymd}T${String(hour).padStart(2, "0")}:00:00Z`).getTime();
  let guess = target;
  for (let i = 0; i < 3; i++) {
    const p = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(guess);
    const get = (key: string) => p.find((x) => x.type === key)!.value;
    const shown = Date.parse(
      `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}Z`,
    );
    guess += target - shown;
  }
  return new Date(guess);
}
export function businessDay(now = new Date()) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (key: string) => p.find((x) => x.type === key)!.value;
  const ymd = `${get("year")}-${get("month")}-${get("day")}`;
  const next = new Date(`${ymd}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return {
    start: chicagoMidnight(ymd),
    end: chicagoMidnight(next.toISOString().slice(0, 10)),
    ymd,
    monthStart: chicagoMidnight(`${get("year")}-${get("month")}-01`),
  };
}
