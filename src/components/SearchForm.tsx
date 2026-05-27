type Race = { id: string; name: string };

export default function SearchForm({
  races,
  defaultQ,
  defaultRaceId,
}: {
  races: Race[];
  defaultQ?: string;
  defaultRaceId?: string;
}) {
  return (
    <form method="get" action="/" className="flex flex-wrap gap-2 justify-center">
      <select
        name="raceId"
        defaultValue={defaultRaceId ?? ""}
        className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm"
      >
        <option value="">All races</option>
        {races.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      <input
        name="q"
        defaultValue={defaultQ}
        placeholder="Last name or bib number"
        className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm min-w-[260px]"
      />
      <button
        type="submit"
        className="bg-ironman-red hover:bg-red-700 text-white rounded px-4 py-2 text-sm font-medium"
      >
        Search
      </button>
    </form>
  );
}
