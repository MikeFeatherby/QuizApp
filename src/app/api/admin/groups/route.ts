import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "../../../../lib/session";
import { supabaseServer } from "../../../../lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await supabaseServer
    .from("groups")
    .select("*")
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const name = (body.name ?? "").toString().trim();

  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("groups")
    .insert({ name })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
