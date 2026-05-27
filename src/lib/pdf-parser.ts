import pdfParse from "pdf-parse";
import { parseTimeToSeconds } from "./format";

export type ParsedParticipant = {
  bib?: string;
  firstName: string;
  lastName: string;
  country?: string;
  ageGroup?: string;
  gender?: string;
  swimSeconds?: number | null;
  t1Seconds?: number | null;
  bikeSeconds?: number | null;
  t2Seconds?: number | null;
  runSeconds?: number | null;
  totalSeconds?: number | null;
  overallRank?: number | null;
  divisionRank?: number | null;
  genderRank?: number | null;
};

/**
 * Parses race-result PDFs. Ironman result PDFs vary by event; this is a
 * best-effort row scanner that looks for the canonical column order:
 *   BIB  NAME  COUNTRY  AGE-GROUP  GENDER  SWIM  T1  BIKE  T2  RUN  FINISH  RANK
 * Lines that don't parse cleanly are skipped — extend the regexes per event.
 */
export async function parseRacePdf(buffer: Buffer): Promise<ParsedParticipant[]> {
  const data = await pdfParse(buffer);
  const lines = data.text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const participants: ParsedParticipant[] = [];
  const timeRe = /(\d{1,2}:\d{2}(?::\d{2})?)/g;

  for (const line of lines) {
    const times = line.match(timeRe);
    if (!times || times.length < 4) continue;

    // Heuristic: bib is a leading number, name follows, age-group like M30-34 / F40-44
    const bibMatch = line.match(/^(\d{1,5})\s+/);
    if (!bibMatch) continue;
    const bib = bibMatch[1];

    const afterBib = line.slice(bibMatch[0].length);
    const ageMatch = afterBib.match(/\b([MF])(\d{2}-\d{2}|PRO)\b/);
    const gender = ageMatch?.[1];
    const ageGroup = ageMatch ? `${ageMatch[1]}${ageMatch[2]}` : undefined;

    const nameEnd = ageMatch ? afterBib.indexOf(ageMatch[0]) : afterBib.indexOf(times[0]);
    const nameRaw = afterBib.slice(0, nameEnd).trim();
    const nameParts = nameRaw.split(/\s+/);
    if (nameParts.length < 2) continue;
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).filter((p) => !/^[A-Z]{2,3}$/.test(p)).join(" ") || nameParts[1];
    const country = nameParts.find((p) => /^[A-Z]{3}$/.test(p));

    // Times: swim, t1, bike, t2, run, finish (some PDFs omit T1/T2)
    const [swim, t1, bike, t2, run, finish] =
      times.length >= 6
        ? times
        : [times[0], null, times[1], null, times[2], times[3]];

    // Trailing ranks
    const tail = line.slice(line.lastIndexOf(times[times.length - 1]) + times[times.length - 1].length);
    const ranks = tail.match(/\d+/g)?.map((n) => parseInt(n, 10)) ?? [];

    participants.push({
      bib,
      firstName,
      lastName,
      country,
      ageGroup,
      gender,
      swimSeconds: parseTimeToSeconds(swim),
      t1Seconds: parseTimeToSeconds(t1 ?? undefined),
      bikeSeconds: parseTimeToSeconds(bike),
      t2Seconds: parseTimeToSeconds(t2 ?? undefined),
      runSeconds: parseTimeToSeconds(run),
      totalSeconds: parseTimeToSeconds(finish),
      overallRank: ranks[0] ?? null,
      divisionRank: ranks[1] ?? null,
      genderRank: ranks[2] ?? null,
    });
  }

  return participants;
}
