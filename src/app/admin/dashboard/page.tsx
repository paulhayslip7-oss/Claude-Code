import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import UploadForm from "@/components/UploadForm";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await getAdminSession();
  if (!session.isAdmin) redirect("/admin");

  const races = await prisma.race.findMany({
    orderBy: { date: "desc" },
    include: { _count: { select: { participants: true } } },
  });
  const purchaseStats = await prisma.purchase.groupBy({
    by: ["status"],
    _count: true,
    _sum: { amountCents: true },
  });

  const paid = purchaseStats.find((s) => s.status === "paid");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      <section className="mb-8 grid grid-cols-3 gap-3">
        <Stat label="Races" value={races.length.toString()} />
        <Stat
          label="Paid reports"
          value={paid?._count?.toString() ?? "0"}
        />
        <Stat
          label="Revenue"
          value={`$${((paid?._sum?.amountCents ?? 0) / 100).toFixed(2)}`}
        />
      </section>

      <section className="mb-10 border border-neutral-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-3">Upload race-result PDF</h2>
        <UploadForm />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Races</h2>
        <ul className="divide-y divide-neutral-800 border border-neutral-800 rounded-lg overflow-hidden">
          {races.map((r) => (
            <li key={r.id} className="px-4 py-3 flex justify-between">
              <span>
                <span className="font-medium">{r.name}</span>
                <span className="text-neutral-500 text-sm ml-2">
                  {r.date.toISOString().slice(0, 10)} · {r.location ?? "—"}
                </span>
              </span>
              <span className="text-neutral-400 text-sm">
                {r._count.participants} participants
              </span>
            </li>
          ))}
          {races.length === 0 && (
            <li className="px-4 py-6 text-neutral-500 text-center">No races yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-neutral-800 bg-neutral-900 rounded px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
