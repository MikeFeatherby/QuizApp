import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  await session.destroy();

  // Redirect back to the login page
  const url = new URL(req.url);
  url.pathname = "/admin";
  url.search = "";
  return NextResponse.redirect(url);
}
