import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ironman Race Recap",
  description: "Search your race, unlock your personalized recap report.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
          <a href="/" className="text-xl font-bold tracking-tight">
            <span className="text-ironman-red">IRON</span>RECAP
          </a>
          <a href="/admin" className="text-sm text-neutral-400 hover:text-white">Admin</a>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
