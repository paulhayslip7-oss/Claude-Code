const STRAVA_API = "https://www.strava.com/api/v3";
const STRAVA_OAUTH = "https://www.strava.com/oauth";

export type StravaTokens = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id: number; firstname?: string; lastname?: string };
};

export type StravaActivity = {
  id: number;
  name: string;
  type: string;
  start_date: string;
  distance: number; // meters
  moving_time: number; // seconds
  total_elevation_gain: number; // meters
  average_heartrate?: number;
  average_watts?: number;
  suffer_score?: number;
};

export type TrainingInsights = {
  totalActivities: number;
  byType: Record<string, { count: number; distanceKm: number; movingHours: number }>;
  weeklyVolume: { weekStart: string; hours: number; distanceKm: number }[];
  longestRide?: { date: string; distanceKm: number; movingHours: number };
  longestRun?: { date: string; distanceKm: number; movingHours: number };
  biggestSwim?: { date: string; distanceKm: number; movingHours: number };
  totalDistanceKm: number;
  totalHours: number;
  totalElevationM: number;
  avgHeartRate?: number;
  windowStart: string;
  windowEnd: string;
};

export function stravaAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "read,activity:read_all",
    approval_prompt: "auto",
    state,
  });
  return `${STRAVA_OAUTH}/authorize?${params.toString()}`;
}

export async function exchangeStravaCode(code: string): Promise<StravaTokens> {
  const res = await fetch(`${STRAVA_OAUTH}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Strava token exchange failed: ${res.status}`);
  return res.json();
}

export async function refreshStravaToken(refreshToken: string): Promise<StravaTokens> {
  const res = await fetch(`${STRAVA_OAUTH}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Strava refresh failed: ${res.status}`);
  return res.json();
}

export async function fetchActivities(
  accessToken: string,
  after: Date,
  before: Date,
): Promise<StravaActivity[]> {
  const out: StravaActivity[] = [];
  let page = 1;
  while (true) {
    const params = new URLSearchParams({
      after: Math.floor(after.getTime() / 1000).toString(),
      before: Math.floor(before.getTime() / 1000).toString(),
      per_page: "100",
      page: page.toString(),
    });
    const res = await fetch(`${STRAVA_API}/athlete/activities?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`Strava activities failed: ${res.status}`);
    const batch = (await res.json()) as StravaActivity[];
    out.push(...batch);
    if (batch.length < 100) break;
    page++;
    if (page > 10) break; // safety cap
  }
  return out;
}

export function computeInsights(
  activities: StravaActivity[],
  windowStart: Date,
  windowEnd: Date,
): TrainingInsights {
  const byType: TrainingInsights["byType"] = {};
  const weeklyMap = new Map<string, { hours: number; distanceKm: number }>();
  let longestRide: TrainingInsights["longestRide"];
  let longestRun: TrainingInsights["longestRun"];
  let biggestSwim: TrainingInsights["biggestSwim"];
  let totalDistanceKm = 0;
  let totalHours = 0;
  let totalElevationM = 0;
  let hrSum = 0;
  let hrCount = 0;

  for (const a of activities) {
    const km = a.distance / 1000;
    const hours = a.moving_time / 3600;
    totalDistanceKm += km;
    totalHours += hours;
    totalElevationM += a.total_elevation_gain || 0;
    if (a.average_heartrate) {
      hrSum += a.average_heartrate;
      hrCount++;
    }

    const key = a.type;
    byType[key] = byType[key] ?? { count: 0, distanceKm: 0, movingHours: 0 };
    byType[key].count++;
    byType[key].distanceKm += km;
    byType[key].movingHours += hours;

    const date = new Date(a.start_date);
    const weekStart = new Date(date);
    weekStart.setUTCDate(date.getUTCDate() - date.getUTCDay());
    weekStart.setUTCHours(0, 0, 0, 0);
    const wk = weekStart.toISOString().slice(0, 10);
    const cur = weeklyMap.get(wk) ?? { hours: 0, distanceKm: 0 };
    cur.hours += hours;
    cur.distanceKm += km;
    weeklyMap.set(wk, cur);

    if (a.type === "Ride" && (!longestRide || km > longestRide.distanceKm)) {
      longestRide = { date: a.start_date.slice(0, 10), distanceKm: km, movingHours: hours };
    }
    if (a.type === "Run" && (!longestRun || km > longestRun.distanceKm)) {
      longestRun = { date: a.start_date.slice(0, 10), distanceKm: km, movingHours: hours };
    }
    if (a.type === "Swim" && (!biggestSwim || km > biggestSwim.distanceKm)) {
      biggestSwim = { date: a.start_date.slice(0, 10), distanceKm: km, movingHours: hours };
    }
  }

  const weeklyVolume = [...weeklyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, v]) => ({ weekStart, ...v }));

  return {
    totalActivities: activities.length,
    byType,
    weeklyVolume,
    longestRide,
    longestRun,
    biggestSwim,
    totalDistanceKm,
    totalHours,
    totalElevationM,
    avgHeartRate: hrCount ? hrSum / hrCount : undefined,
    windowStart: windowStart.toISOString().slice(0, 10),
    windowEnd: windowEnd.toISOString().slice(0, 10),
  };
}
