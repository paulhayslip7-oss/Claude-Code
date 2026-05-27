import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type AdminSession = { isAdmin?: boolean };

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? "fallback-dev-only-secret-please-set-32+chars",
  cookieName: "ironman_admin_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  },
};

export async function getAdminSession() {
  return getIronSession<AdminSession>(cookies(), sessionOptions);
}

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session.isAdmin) throw new Error("Unauthorized");
  return session;
}
