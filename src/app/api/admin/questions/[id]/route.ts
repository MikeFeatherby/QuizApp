import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/questions/:id (sanity check) */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = (params.id || "").trim();
  return NextResponse.json({ ok: true, id, route: "/api/admin/questions/[id]" });
}

/** PATCH /api/admin/questions/:id  { prompt: string } */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = (params.id || "").trim();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const raw = await req.text();
  let body: any = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const promptRaw = body?.prompt;
  if (typeof promptRaw !== "string") {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }
  const prompt = promptRaw.trim();
  if (!prompt) return NextResponse.json({ error: "prompt cannot be empty" }, { status: 400 });
  if (prompt.length > 2000) return NextResponse.json({ error: "prompt too long" }, { status: 400 });

  const { data: existing, error: selErr } = await supabaseServer
    .from("questions")
    .select("id, prompt, created_at")
    .eq("id", id)
    .maybeSingle();
  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  if (existing.prompt === prompt) return NextResponse.json(existing);

  const { data, error } = await supabaseServer
    .from("questions")
    .update({ prompt })
    .eq("id", id)
    .select("id, prompt, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
