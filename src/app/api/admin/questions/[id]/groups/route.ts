import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { supabaseServer } from "@/lib/supabaseServer";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** List groups linked to a question */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const questionId = params.id;
  if (!questionId) {
    return NextResponse.json({ error: "Missing question id" }, { status: 400 });
  }

  // join question_groups → groups
  const { data, error } = await supabaseServer
    .from("question_groups")
    .select("group:groups(id, name, created_at)")
    .eq("question_id", questionId)
    .order("group(name)", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // flatten to array of groups
  const groups = (data ?? []).map((row: any) => row.group);
  return NextResponse.json(groups);
}

/** Link a question to a group (admin only) */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const questionId = params.id;
  const body = (await req.json().catch(() => ({}))) as { group_id?: string };
  const groupId = (body.group_id ?? "").toString().trim();

  if (!questionId || !groupId) {
    return NextResponse.json({ error: "question_id and group_id required" }, { status: 400 });
  }

  const { error } = await supabaseServer
    .from("question_groups")
    .insert({ question_id: questionId, group_id: groupId });

  // ignore duplicate links (already linked)
  // Postgres duplicate key error code is 23505

  if (error && error.code !== "23505") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

/** Unlink a question from a group (admin only) */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const questionId = params.id;
  const url = new URL(req.url);
  const groupId = (url.searchParams.get("group_id") ?? "").toString().trim();

  if (!questionId || !groupId) {
    return NextResponse.json({ error: "question_id and group_id required" }, { status: 400 });
  }

  const { error } = await supabaseServer
    .from("question_groups")
    .delete()
    .eq("question_id", questionId)
    .eq("group_id", groupId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
