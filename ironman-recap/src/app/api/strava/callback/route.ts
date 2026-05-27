import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeInsights, exchangeStravaCode, fetchActivities } from "@/lib/strava";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const purchaseId = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  if (error || !code || !purchaseId) {
    return NextResponse.redirect(`${appUrl}/?strava_error=${error ?? "missing"}`);
  }

  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: { participant: { include: { race: true } } },
  });
  if (!purchase || purchase.status !== "paid") {
    return NextResponse.redirect(`${appUrl}/?strava_error=invalid_purchase`);
  }

  const tokens = await exchangeStravaCode(code);

  const raceDate = purchase.participant.race.date;
  const windowEnd = new Date(raceDate);
  const windowStart = new Date(raceDate);
  windowStart.setMonth(windowStart.getMonth() - 3);

  const activities = await fetchActivities(tokens.access_token, windowStart, windowEnd);
  const insights = computeInsights(activities, windowStart, windowEnd);

  await prisma.purchase.update({
    where: { id: purchase.id },
    data: {
      stravaAccessToken: tokens.access_token,
      stravaRefreshToken: tokens.refresh_token,
      stravaExpiresAt: tokens.expires_at,
      stravaAthleteId: tokens.athlete?.id?.toString(),
      stravaInsightsJson: JSON.stringify(insights),
    },
  });

  return NextResponse.redirect(`${appUrl}/report/${purchase.stripeSessionId}`);
}
