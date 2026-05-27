import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";

export default async function AdminLogin({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const session = await getAdminSession();
  if (session.isAdmin) redirect("/admin/dashboard");

  return (
    <div className="max-w-sm mx-auto">
      <h1 className="text-2xl font-bold mb-6">Admin sign-in</h1>
      <form method="post" action="/api/admin/login" className="space-y-3">
        <input
          name="password"
          type="password"
          required
          placeholder="Admin password"
          className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
        />
        <button
          type="submit"
          className="w-full bg-ironman-red hover:bg-red-700 text-white rounded px-4 py-2 font-medium"
        >
          Sign in
        </button>
        {searchParams.error && (
          <p className="text-red-400 text-sm">Invalid password.</p>
        )}
      </form>
    </div>
  );
}
