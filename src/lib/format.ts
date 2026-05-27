export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function parseTimeToSeconds(s: string | undefined | null): number | null {
  if (!s) return null;
  const trimmed = s.trim();
  if (!trimmed || trimmed === "—" || trimmed === "DNF" || trimmed === "DNS") return null;
  const parts = trimmed.split(":").map((x) => parseInt(x, 10));
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}
