import { prisma } from "@/lib/prisma";
import SearchForm from "@/components/SearchForm";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { q?: string; raceId?: string };
}) {
  const races = await prisma.race.findMany({ orderBy: { date: "desc" } });
  const q = (searchParams.q ?? "").trim();
  const raceId = searchParams.raceId;

  const participants = q
    ? await prisma.participant.findMany({
        where: {
          ...(raceId ? { raceId } : {}),
          OR: [
            { lastName: { contains: q } },
            { firstName: { contains: q } },
            { bib: { equals: q } },
          ],
        },
        include: { race: true },
        take: 25,
      })
    : [];

  return (
    <div>
      <section className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-3">Your race, in detail.</h1>
        <p className="text-neutral-400 mb-6">
          Find your finish, unlock a $5 personalized recap — splits, ranks, and (optionally) your
          last 3 months of Strava training laid against the data.
        </p>
        <SearchForm races={races} defaultQ={q} defaultRaceId={raceId} />
      </section>

      {q && (
        <section>
          <h2 className="text-lg font-semibold mb-3">
            {participants.length} result{participants.length === 1 ? "" : "s"} for &ldquo;{q}&rdquo;
          </h2>
          <ul className="divide-y divide-neutral-800 border border-neutral-800 rounded-lg overflow-hidden">
            {participants.map((p) => (
              <li key={p.id}>
                <a
                  href={`/participant/${p.id}`}
                  className="block px-4 py-3 hover:bg-neutral-900 flex justify-between"
                >
                  <span>
                    <span className="font-medium">
                      {p.firstName} {p.lastName}
                    </span>
                    <span className="text-neutral-500 text-sm ml-2">
                      bib #{p.bib ?? "—"} · {p.ageGroup ?? "—"}
                    </span>
                  </span>
                  <span className="text-neutral-400 text-sm">{p.race.name}</span>
                </a>
              </li>
            ))}
            {participants.length === 0 && (
              <li className="px-4 py-6 text-neutral-500 text-center">
                No matches. Try a different spelling or bib number.
              </li>
            )}
          </ul>
        </section>
      )}
    </div>
  );
}
