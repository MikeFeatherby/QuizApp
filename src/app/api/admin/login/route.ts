import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/admin/login" });
}

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string } = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    // ignore
  }

  const emailRaw = String(body?.email ?? "");
  const passwordRaw = String(body?.password ?? "");

  // Normalize inputs
  const email = emailRaw.trim().toLowerCase();
  const password = passwordRaw; // don't trim passwords

  // Env (server-side)
  const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

  const emailMatch = email === ADMIN_EMAIL;
  const passMatch = password === ADMIN_PASSWORD;

  // Minimal debug (doesn't leak secrets)
  console.log("POST /api/admin/login", {
    emailProvided: Boolean(email),
    emailMatch,
    passMatch,
  });

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password required" },
      { status: 400 }
    );
  }

  if (emailMatch && passMatch) {
    const session = await getSession();
    session.isAdmin = true;
    session.adminEmail = ADMIN_EMAIL;
    await session.save();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}
