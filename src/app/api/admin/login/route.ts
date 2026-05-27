import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";

export async function POST(req: Request) {
  const form = await req.formData();
  const password = String(form.get("password") ?? "");
  const expected = process.env.ADMIN_PASSWORD ?? "";

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  if (!expected || password !== expected) {
    return NextResponse.redirect(`${appUrl}/admin?error=1`, { status: 303 });
  }

  const session = await getAdminSession();
  session.isAdmin = true;
  await session.save();

  return NextResponse.redirect(`${appUrl}/admin/dashboard`, { status: 303 });
}
