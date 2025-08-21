import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PATCH /api/admin/choices/:choiceId  (rename / toggle correct) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { choiceId: string } }
) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const choiceId = (params.choiceId || "").trim();
  if (!choiceId) {
    return NextResponse.json({ error: "choiceId required" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    label?: string;
    is_correct?: boolean;
  };

  const patch: Record<string, unknown> = {};
  if (typeof body.label === "string") patch.label = body.label.trim();
  if (typeof body.is_correct === "boolean") patch.is_correct = body.is_correct;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("choices")
    .update(patch)
    .eq("id", choiceId)
    .select("id, label, is_correct, question_id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/** DELETE /api/admin/choices/:choiceId  (admin only) */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { choiceId: string } }
) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const choiceId = (params.choiceId || "").trim();
  if (!choiceId) {
    return NextResponse.json({ error: "choiceId required" }, { status: 400 });
  }

  const { error } = await supabaseServer.from("choices").delete().eq("id", choiceId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
