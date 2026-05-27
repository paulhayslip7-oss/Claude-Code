import { parseTimeToSeconds } from "./format";

export type ParsedParticipant = {
  bib: string;
  firstName: string;
  lastName: string;
  country?: string;
  gender?: string;
  ageGroup?: string;
  swimSeconds: number | null;
  t1Seconds: number | null;
  bikeSeconds: number | null;
  t2Seconds: number | null;
  runSeconds: number | null;
  totalSeconds: number | null;
  overallRank: number | null;
  genderRank: number | null;
  divisionRank: number | null;
  swimDivisionRank: number | null;
  bikeDivisionRank: number | null;
  runDivisionRank: number | null;
  finishStatus: string | null;
  qualifierSeconds: number | null;
  qualifierRank: number | null;
  qualified: boolean | null;
};

/**
 * Parses a CoachCox-format results CSV. Header row maps to:
 *   Bib, Name, Country, Gender, Division,
 *   Overall Time, Overall Rank, Gender Rank, Age Group Rank,
 *   Swim Time, Swim Rank, Gender Swim Rank, Age Group Swim Rank,
 *   Bike Time, Bike Rank, Gender Bike Rank, Age Group Bike Rank,
 *   Run Time, Run Rank, Gender Run Rank, Age Group Run Rank,
 *   Transition 1 Time, Transition 1 Rank, Gender Transition 1 Rank, Age Group Transition 1 Rank,
 *   Transition 2 Time, Transition 2 Rank, Gender Transition 2 Rank, Age Group Transition 2 Rank,
 *   Finish, Qualifier Time, Qualifier Rank, Gender Qualifier Rank, Qualified
 */
export function parseResultsCsv(text: string): ParsedParticipant[] {
  const rows = splitCsv(text);
  if (rows.length < 2) return [];

  const header = rows[0].map((c) => c.trim());
  const idx = (name: string) => header.indexOf(name);

  const col = {
    bib: idx("Bib"),
    name: idx("Name"),
    country: idx("Country"),
    gender: idx("Gender"),
    division: idx("Division"),
    overallTime: idx("Overall Time"),
    overallRank: idx("Overall Rank"),
    genderRank: idx("Gender Rank"),
    ageGroupRank: idx("Age Group Rank"),
    swimTime: idx("Swim Time"),
    swimAgRank: idx("Age Group Swim Rank"),
    bikeTime: idx("Bike Time"),
    bikeAgRank: idx("Age Group Bike Rank"),
    runTime: idx("Run Time"),
    runAgRank: idx("Age Group Run Rank"),
    t1Time: idx("Transition 1 Time"),
    t2Time: idx("Transition 2 Time"),
    finish: idx("Finish"),
    qualifierTime: idx("Qualifier Time"),
    qualifierRank: idx("Qualifier Rank"),
    qualified: idx("Qualified"),
  };

  if (col.bib < 0 || col.name < 0 || col.overallTime < 0) {
    throw new Error("Unrecognized CSV format — expected CoachCox column headers.");
  }

  const out: ParsedParticipant[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length === 0 || (r.length === 1 && !r[0].trim())) continue;

    const bib = (r[col.bib] ?? "").trim();
    const fullName = (r[col.name] ?? "").trim();
    if (!bib || !fullName) continue;

    const { firstName, lastName } = splitName(fullName);

    const division = clean(r[col.division]);
    // CoachCox "Division" looks like M60-64 / F35-39 / MPRO. Pull gender from CSV column primarily, fall back to division prefix.
    const genderRaw = clean(r[col.gender]);
    const gender = genderRaw ? genderRaw[0]?.toUpperCase() : division?.[0]?.toUpperCase();

    const qualifiedRaw = clean(r[col.qualified]);
    const qualified =
      qualifiedRaw === "1" || qualifiedRaw?.toLowerCase() === "true"
        ? true
        : qualifiedRaw === "0" || qualifiedRaw?.toLowerCase() === "false"
        ? false
        : null;

    out.push({
      bib,
      firstName,
      lastName,
      country: clean(r[col.country]) ?? undefined,
      gender: gender ?? undefined,
      ageGroup: division ?? undefined,
      swimSeconds: parseTimeToSeconds(r[col.swimTime]),
      t1Seconds: parseTimeToSeconds(r[col.t1Time]),
      bikeSeconds: parseTimeToSeconds(r[col.bikeTime]),
      t2Seconds: parseTimeToSeconds(r[col.t2Time]),
      runSeconds: parseTimeToSeconds(r[col.runTime]),
      totalSeconds: parseTimeToSeconds(r[col.overallTime]),
      overallRank: parseIntOrNull(r[col.overallRank]),
      genderRank: parseIntOrNull(r[col.genderRank]),
      divisionRank: parseIntOrNull(r[col.ageGroupRank]),
      swimDivisionRank: parseIntOrNull(r[col.swimAgRank]),
      bikeDivisionRank: parseIntOrNull(r[col.bikeAgRank]),
      runDivisionRank: parseIntOrNull(r[col.runAgRank]),
      finishStatus: clean(r[col.finish]) ?? null,
      qualifierSeconds: parseTimeToSeconds(r[col.qualifierTime]),
      qualifierRank: parseIntOrNull(r[col.qualifierRank]),
      qualified,
    });
  }

  return out;
}

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function clean(v: string | undefined): string | undefined {
  if (v == null) return undefined;
  const s = v.trim();
  return s.length ? s : undefined;
}

function parseIntOrNull(v: string | undefined): number | null {
  if (v == null) return null;
  const s = v.trim();
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Minimal RFC-4180-ish CSV splitter. Handles quoted fields with embedded commas
 * and escaped double-quotes. Returns rows of fields.
 */
function splitCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        cur.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        cur.push(field);
        rows.push(cur);
        cur = [];
        field = "";
      } else {
        field += c;
      }
    }
  }
  if (field.length || cur.length) {
    cur.push(field);
    rows.push(cur);
  }
  return rows;
}
