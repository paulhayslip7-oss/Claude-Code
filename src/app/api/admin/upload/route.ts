import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { parseResultsCsv } from "@/lib/results-parser";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const name = String(form.get("name") ?? "").trim();
  const date = String(form.get("date") ?? "").trim();
  const location = String(form.get("location") ?? "").trim() || null;
  const file = form.get("results");

  if (!name || !date || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const text = await file.text();

  let parsed;
  try {
    parsed = parseResultsCsv(text);
  } catch (err: any) {
    return NextResponse.json({ error: `CSV parse failed: ${err.message}` }, { status: 400 });
  }

  if (parsed.length === 0) {
    return NextResponse.json(
      { error: "No participants found. Verify the CSV format." },
      { status: 400 },
    );
  }

  const race = await prisma.race.create({
    data: {
      name,
      date: new Date(date),
      location,
      resultsFilename: file.name,
    },
  });

  // SQLite has a parameter cap; chunk the insert.
  const chunkSize = 200;
  for (let i = 0; i < parsed.length; i += chunkSize) {
    const chunk = parsed.slice(i, i + chunkSize);
    await prisma.participant.createMany({
      data: chunk.map((p) => ({
        raceId: race.id,
        bib: p.bib,
        firstName: p.firstName,
        lastName: p.lastName,
        country: p.country,
        ageGroup: p.ageGroup,
        gender: p.gender,
        swimSeconds: p.swimSeconds,
        t1Seconds: p.t1Seconds,
        bikeSeconds: p.bikeSeconds,
        t2Seconds: p.t2Seconds,
        runSeconds: p.runSeconds,
        totalSeconds: p.totalSeconds,
        overallRank: p.overallRank,
        divisionRank: p.divisionRank,
        genderRank: p.genderRank,
        swimDivisionRank: p.swimDivisionRank,
        bikeDivisionRank: p.bikeDivisionRank,
        runDivisionRank: p.runDivisionRank,
        finishStatus: p.finishStatus,
        qualifierSeconds: p.qualifierSeconds,
        qualifierRank: p.qualifierRank,
        qualified: p.qualified,
      })),
    });
  }

  return NextResponse.json({ raceId: race.id, raceName: race.name, count: parsed.length });
}
