import { NextResponse } from "next/server";
import { stravaAuthUrl } from "@/lib/strava";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const purchaseId = searchParams.get("purchaseId");
  if (!purchaseId) return NextResponse.json({ error: "missing purchaseId" }, { status: 400 });

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const redirectUri = `${appUrl}/api/strava/callback`;
  const url = stravaAuthUrl(purchaseId, redirectUri);
  return NextResponse.redirect(url);
}
