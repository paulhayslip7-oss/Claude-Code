import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { parseRacePdf } from "@/lib/pdf-parser";

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
  const file = form.get("pdf");

  if (!name || !date || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());

  let parsed;
  try {
    parsed = await parseRacePdf(buf);
  } catch (err: any) {
    return NextResponse.json({ error: `PDF parse failed: ${err.message}` }, { status: 400 });
  }

  if (parsed.length === 0) {
    return NextResponse.json(
      { error: "No participants found. Verify the PDF format." },
      { status: 400 },
    );
  }

  const race = await prisma.race.create({
    data: {
      name,
      date: new Date(date),
      location,
      pdfFilename: file.name,
      participants: {
        create: parsed.map((p) => ({
          bib: p.bib,
          firstName: p.firstName,
          lastName: p.lastName,
          country: p.country,
          ageGroup: p.ageGroup,
          gender: p.gender,
          swimSeconds: p.swimSeconds ?? null,
          t1Seconds: p.t1Seconds ?? null,
          bikeSeconds: p.bikeSeconds ?? null,
          t2Seconds: p.t2Seconds ?? null,
          runSeconds: p.runSeconds ?? null,
          totalSeconds: p.totalSeconds ?? null,
          overallRank: p.overallRank ?? null,
          divisionRank: p.divisionRank ?? null,
          genderRank: p.genderRank ?? null,
        })),
      },
    },
  });

  return NextResponse.json({ raceId: race.id, raceName: race.name, count: parsed.length });
}
