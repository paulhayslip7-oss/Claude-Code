export default function StravaConnect({ purchaseId }: { purchaseId: string }) {
  return (
    <div>
      <p className="text-neutral-400 text-sm mb-4">
        Connect your Strava account to layer your last 3 months of training on top of your race
        result. Read-only access — we never post on your behalf.
      </p>
      <a
        href={`/api/strava/connect?purchaseId=${purchaseId}`}
        className="inline-block bg-[#fc4c02] hover:bg-orange-600 text-white rounded px-4 py-2 text-sm font-medium"
      >
        Connect with Strava
      </a>
    </div>
  );
}
