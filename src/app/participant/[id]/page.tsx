import { prisma } from "@/lib/prisma";
import { formatDuration } from "@/lib/format";
import { notFound } from "next/navigation";
import CheckoutButton from "@/components/CheckoutButton";

export const dynamic = "force-dynamic";

export default async function ParticipantPage({ params }: { params: { id: string } }) {
  const participant = await prisma.participant.findUnique({
    where: { id: params.id },
    include: { race: true },
  });
  if (!participant) notFound();

  return (
    <div>
      <p className="text-sm text-neutral-500 mb-2">{participant.race.name}</p>
      <h1 className="text-3xl font-bold mb-1">
        {participant.firstName} {participant.lastName}
      </h1>
      <p className="text-neutral-400 mb-8">
        Bib #{participant.bib ?? "—"} · {participant.ageGroup ?? "—"} ·{" "}
        {participant.country ?? "—"}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Stat label="Swim" value={formatDuration(participant.swimSeconds)} />
        <Stat label="Bike" value={formatDuration(participant.bikeSeconds)} />
        <Stat label="Run" value={formatDuration(participant.runSeconds)} />
        <Stat label="Finish" value={formatDuration(participant.totalSeconds)} highlight />
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-2">Unlock your full recap — $5</h2>
        <ul className="text-neutral-400 text-sm space-y-1 mb-5 list-disc pl-5">
          <li>Full split breakdown including T1/T2</li>
          <li>Overall, gender, and division ranks with percentile</li>
          <li>Comparison vs. age-group median</li>
          <li>
            Optional: connect Strava to overlay your last 3 months of training
          </li>
        </ul>
        <CheckoutButton participantId={participant.id} />
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`border rounded-lg px-4 py-3 ${
        highlight ? "border-ironman-red bg-ironman-red/10" : "border-neutral-800 bg-neutral-900"
      }`}
    >
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="text-xl font-mono font-semibold">{value}</div>
    </div>
  );
}
