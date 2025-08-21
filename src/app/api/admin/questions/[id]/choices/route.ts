import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** List choices for a question */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const questionId = params.id;
  if (!questionId) {
    return NextResponse.json({ error: "Missing question id" }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("choices")
    .select("id, label, is_correct, question_id")
    .eq("question_id", questionId)
    .order("label", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/** Create a new choice (admin-only) */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const questionId = params.id;
  if (!questionId) {
    return NextResponse.json({ error: "Missing question id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    label?: string;
    is_correct?: boolean;
  };

  const label = (body.label ?? "").toString().trim();
  const is_correct = Boolean(body.is_correct);

  if (!label) {
    return NextResponse.json({ error: "Label is required" }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("choices")
    .insert({ question_id: questionId, label, is_correct })
    .select("id, label, is_correct, question_id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
