import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/groups -> [{ id, name, created_at }] */
export async function GET() {
  const { data, error } = await supabaseServer
    .from("groups")
    .select("id, name, created_at")
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
