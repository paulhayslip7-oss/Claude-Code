import type { TrainingInsights } from "@/lib/strava";
import { formatDuration } from "@/lib/format";

export default function TrainingInsightsPanel({ insights }: { insights: TrainingInsights }) {
  const peakWeek = [...insights.weeklyVolume].sort((a, b) => b.hours - a.hours)[0];

  return (
    <div className="space-y-5">
      <p className="text-sm text-neutral-400">
        {insights.windowStart} → {insights.windowEnd} · {insights.totalActivities} activities
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Cell label="Total time" value={`${insights.totalHours.toFixed(1)} h`} />
        <Cell label="Total distance" value={`${insights.totalDistanceKm.toFixed(0)} km`} />
        <Cell label="Elevation" value={`${insights.totalElevationM.toFixed(0)} m`} />
        <Cell
          label="Avg HR"
          value={insights.avgHeartRate ? `${insights.avgHeartRate.toFixed(0)} bpm` : "—"}
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">By discipline</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {Object.entries(insights.byType).map(([type, v]) => (
            <div
              key={type}
              className="border border-neutral-800 rounded px-3 py-2 text-sm flex justify-between"
            >
              <span className="text-neutral-300">{type}</span>
              <span className="text-neutral-400">
                {v.count} · {v.distanceKm.toFixed(0)} km · {v.movingHours.toFixed(1)} h
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {insights.longestRide && (
          <Cell
            label="Longest ride"
            value={`${insights.longestRide.distanceKm.toFixed(0)} km`}
            sub={`${formatDuration(Math.round(insights.longestRide.movingHours * 3600))} · ${insights.longestRide.date}`}
          />
        )}
        {insights.longestRun && (
          <Cell
            label="Longest run"
            value={`${insights.longestRun.distanceKm.toFixed(1)} km`}
            sub={`${formatDuration(Math.round(insights.longestRun.movingHours * 3600))} · ${insights.longestRun.date}`}
          />
        )}
        {insights.biggestSwim && (
          <Cell
            label="Biggest swim"
            value={`${insights.biggestSwim.distanceKm.toFixed(2)} km`}
            sub={`${formatDuration(Math.round(insights.biggestSwim.movingHours * 3600))} · ${insights.biggestSwim.date}`}
          />
        )}
      </div>

      {peakWeek && (
        <p className="text-sm text-neutral-400">
          Peak training week was the week of <span className="font-mono">{peakWeek.weekStart}</span>:{" "}
          {peakWeek.hours.toFixed(1)} hours, {peakWeek.distanceKm.toFixed(0)} km.
        </p>
      )}
    </div>
  );
}

function Cell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-neutral-800 bg-neutral-900 rounded px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="text-lg font-mono font-semibold">{value}</div>
      {sub && <div className="text-xs text-neutral-500">{sub}</div>}
    </div>
  );
}
