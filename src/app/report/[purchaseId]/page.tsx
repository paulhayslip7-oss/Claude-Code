import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { formatDuration } from "@/lib/format";
import { notFound } from "next/navigation";
import StravaConnect from "@/components/StravaConnect";
import TrainingInsightsPanel from "@/components/TrainingInsightsPanel";

export const dynamic = "force-dynamic";

// The param is the Stripe Checkout session ID from the success_url template.
export default async function ReportPage({ params }: { params: { purchaseId: string } }) {
  const sessionId = params.purchaseId;

  // Reconcile in case the webhook hasn't fired yet (common in local dev).
  let purchase = await prisma.purchase.findUnique({
    where: { stripeSessionId: sessionId },
    include: { participant: { include: { race: true } } },
  });
  if (!purchase) notFound();

  if (purchase.status !== "paid") {
    try {
      const s = await stripe.checkout.sessions.retrieve(sessionId);
      if (s.payment_status === "paid") {
        purchase = await prisma.purchase.update({
          where: { id: purchase.id },
          data: { status: "paid", paidAt: new Date() },
          include: { participant: { include: { race: true } } },
        });
      }
    } catch {
      // ignore — webhook will catch up
    }
  }

  if (purchase.status !== "paid") {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-semibold mb-2">Hang tight…</h1>
        <p className="text-neutral-400">
          Payment is processing. Refresh in a moment to load your recap.
        </p>
      </div>
    );
  }

  const p = purchase.participant;
  const r = p.race;

  // Cohort comparison: median in division
  const division = await prisma.participant.findMany({
    where: { raceId: r.id, ageGroup: p.ageGroup ?? undefined, totalSeconds: { not: null } },
    select: { totalSeconds: true },
  });
  const totals = division.map((d) => d.totalSeconds!).sort((a, b) => a - b);
  const median = totals.length ? totals[Math.floor(totals.length / 2)] : null;
  const percentile =
    p.divisionRank && totals.length
      ? Math.round((1 - p.divisionRank / totals.length) * 100)
      : null;

  const insights = purchase.stravaInsightsJson ? JSON.parse(purchase.stravaInsightsJson) : null;

  return (
    <div>
      <p className="text-sm text-neutral-500 mb-1">{r.name}</p>
      <h1 className="text-3xl font-bold mb-1">
        {p.firstName} {p.lastName}
      </h1>
      <p className="text-neutral-400 mb-8">
        Bib #{p.bib ?? "—"} · {p.ageGroup ?? "—"}
      </p>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Splits</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          <Stat label="Swim" value={formatDuration(p.swimSeconds)} />
          <Stat label="T1" value={formatDuration(p.t1Seconds)} />
          <Stat label="Bike" value={formatDuration(p.bikeSeconds)} />
          <Stat label="T2" value={formatDuration(p.t2Seconds)} />
          <Stat label="Run" value={formatDuration(p.runSeconds)} />
          <Stat label="Finish" value={formatDuration(p.totalSeconds)} highlight />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Ranks</h2>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Overall" value={p.overallRank?.toString() ?? "—"} />
          <Stat label="Gender" value={p.genderRank?.toString() ?? "—"} />
          <Stat
            label="Division"
            value={
              p.divisionRank
                ? `${p.divisionRank}${percentile ? ` (top ${100 - percentile}%)` : ""}`
                : "—"
            }
          />
        </div>
        {median && (
          <p className="text-sm text-neutral-400 mt-3">
            Division median finish: <span className="font-mono">{formatDuration(median)}</span>
            {p.totalSeconds && (
              <>
                {" "}
                — you finished{" "}
                <span className={p.totalSeconds < median ? "text-green-400" : "text-red-400"}>
                  {formatDuration(Math.abs(p.totalSeconds - median))}{" "}
                  {p.totalSeconds < median ? "faster" : "slower"}
                </span>
                .
              </>
            )}
          </p>
        )}
      </section>

      <section className="mb-8 border border-neutral-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-2">Training context (last 3 months)</h2>
        {insights ? (
          <TrainingInsightsPanel insights={insights} />
        ) : (
          <StravaConnect purchaseId={purchase.id} />
        )}
      </section>
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
      <div className="text-lg font-mono font-semibold">{value}</div>
    </div>
  );
}
