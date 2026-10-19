// RFC-style quoted CSV, including embedded commas/newlines and escaped quotes.
export function parseApplicantCsv(text: string) {
  if (text.length > 24000) throw new Error("Import up to 24 KB at a time.");
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false,
    closed = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += c;
    } else if (c === '"') {
      if (cell || closed) throw new Error("Invalid CSV quoting.");
      quoted = true;
    } else if (c === "," || c === "\n" || c === "\r") {
      row.push(cell);
      cell = "";
      closed = false;
      if (c !== ",") {
        if (c === "\r" && input[i + 1] === "\n") i++;
        if (row.some((v) => v.trim())) rows.push(row);
        row = [];
      }
    } else {
      if (closed) throw new Error("Unexpected text after a quoted CSV field.");
      cell += c;
    }
  }
  if (quoted) throw new Error("Unclosed CSV quote.");
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  if (rows.length < 2 || rows.length > 101)
    throw new Error("Include a header and 1–100 applicant rows.");
  const headers = rows.shift()!.map((h) => h.trim().toLowerCase());
  const allowed = [
    "name",
    "email",
    "phone",
    "country",
    "city",
    "skills",
    "years",
    "availability",
    "experience",
    "resume",
  ];
  if (new Set(headers).size !== headers.length || headers.some((h) => !allowed.includes(h)))
    throw new Error("Use only the template column names, without duplicate columns.");
  if (["name", "email", "phone", "experience"].some((h) => !headers.includes(h)))
    throw new Error("Required columns: name,email,phone,experience.");
  return rows.map((r, i) => {
    if (r.length !== headers.length)
      throw new Error(`Row ${i + 2} has the wrong number of columns.`);
    return Object.fromEntries(headers.map((h, j) => [h, r[j].trim()]));
  });
}
