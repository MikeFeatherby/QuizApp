import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/quiz/answer" });
}

/**
 * POST body:
 * {
 *   attempt_id: string,
 *   question_id: string,
 *   selected_choice_ids: string[]
 * }
 *
 * Returns: { correct: boolean, score: number }
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    attempt_id?: string;
    question_id?: string;
    selected_choice_ids?: string[];
  };

  const attempt_id = String(body.attempt_id ?? "").trim();
  const question_id = String(body.question_id ?? "").trim();
  const selected_choice_ids = Array.isArray(body.selected_choice_ids)
    ? body.selected_choice_ids.map(String)
    : [];

  if (!attempt_id || !question_id) {
    return NextResponse.json(
      { error: "attempt_id and question_id are required" },
      { status: 400 }
    );
  }
  if (selected_choice_ids.length === 0) {
    return NextResponse.json(
      { error: "selected_choice_ids must be a non-empty array" },
      { status: 400 }
    );
  }

  // Block duplicate answers for the same question/attempt
  {
    const { data: existing, error: existErr } = await supabaseServer
      .from("attempt_answers")
      .select("id")
      .eq("attempt_id", attempt_id)
      .eq("question_id", question_id)
      .maybeSingle();

    if (existErr) return NextResponse.json({ error: existErr.message }, { status: 500 });
    if (existing) {
      return NextResponse.json(
        { error: "Question already answered for this attempt" },
        { status: 409 }
      );
    }
  }

  // Load correct choice IDs
  const { data: correctChoices, error: choicesErr } = await supabaseServer
    .from("choices")
    .select("id, is_correct")
    .eq("question_id", question_id);

  if (choicesErr) return NextResponse.json({ error: choicesErr.message }, { status: 500 });

  const correctSet = new Set(
    (correctChoices ?? []).filter((c) => c.is_correct).map((c) => c.id)
  );
  const selectedSet = new Set(selected_choice_ids);

  // Exact-match grading: all correct and no extras
  const is_correct =
    correctSet.size > 0 &&
    correctSet.size === selectedSet.size &&
    [...correctSet].every((id) => selectedSet.has(id));

  // Record the answer
  const { error: insertErr } = await supabaseServer.from("attempt_answers").insert({
    attempt_id,
    question_id,
    selected_choice_ids,
    is_correct,
  });
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  // Increment score if correct (read → add 1 → write)
  let score = 0;
  {
    const { data, error } = await supabaseServer
      .from("attempts")
      .select("score")
      .eq("id", attempt_id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    score = Number(data?.score ?? 0);
  }
  if (is_correct) {
    const { error: upErr } = await supabaseServer
      .from("attempts")
      .update({ score: score + 1 })
      .eq("id", attempt_id);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    score = score + 1;
  }

  return NextResponse.json({ correct: is_correct, score });
}
