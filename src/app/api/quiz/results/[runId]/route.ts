import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnswerRow = {
  question_id: string;
  // Your table may have one or both of these columns:
  choice_id?: string | null;
  selected_choice_ids?: string[] | null;
};

function normalizeAnswerRows(data: unknown): AnswerRow[] {
  if (!Array.isArray(data)) return [];
  return (data as any[]).map((r) => ({
    question_id: String(r?.question_id ?? ''),
    choice_id: r?.choice_id ?? null,
    selected_choice_ids: Array.isArray(r?.selected_choice_ids) ? r.selected_choice_ids : null,
  })).filter(r => r.question_id); // keep only valid rows
}

// tiny helper
function sameSet(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

/** GET /api/quiz/results/:runId */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> } // Next.js (v15+) dynamic params are async
) {
  const { runId } = await params;
  const attemptId = (runId || "").trim();
  if (!attemptId) return NextResponse.json({ error: "runId required" }, { status: 400 });

  // 1) Read answers from YOUR table
  //    Table: attempt_answers
  //    Filter column: attempt_id
  //    Columns: question_id + (choice_id OR selected_choice_ids)
  const selects = [
  "question_id, choice_id, selected_choice_ids",
  "question_id, choice_id",
  "question_id, selected_choice_ids",
];

let answers: AnswerRow[] | null = null;
let lastErr: string | undefined;

for (const sel of selects) {
  const { data, error } = await supabaseServer
    .from("attempt_answers")
    .select(sel as any)               // dynamic columns → relax typing
    .eq("attempt_id", attemptId);

  if (error) {
    lastErr = error.message;
    continue;
  }

  // Normalize shape and cast through unknown safely
  answers = normalizeAnswerRows(data as unknown);
  break;
}

if (!answers) {
  return NextResponse.json(
    { error: "Failed to read attempt_answers", detail: lastErr },
    { status: 500 }
  );
}


  // Build Map<question_id, selected choice ids>
  const byQ = new Map<string, string[]>();
  for (const row of answers) {
    const qid = row.question_id;
    if (!qid) continue;

    if (Array.isArray(row.selected_choice_ids) && row.selected_choice_ids.length) {
      byQ.set(qid, [ ...(byQ.get(qid) ?? []), ...row.selected_choice_ids ]);
    }
    if (row.choice_id) {
      byQ.set(qid, [ ...(byQ.get(qid) ?? []), row.choice_id ]);
    }
  }

  const qids = Array.from(byQ.keys());
  if (qids.length === 0) {
    return NextResponse.json({ runId: attemptId, incorrect: [] });
  }

  // 2) Fetch questions
  const { data: questions, error: qErr } = await supabaseServer
    .from("questions")
    .select("id, prompt")
    .in("id", qids);
  if (qErr) return NextResponse.json({ error: qErr.message, step: "questions" }, { status: 500 });

  // 3) Fetch choices
  const { data: choices, error: cErr } = await supabaseServer
    .from("choices")
    .select("id, label, is_correct, question_id")
    .in("question_id", qids);
  if (cErr) return NextResponse.json({ error: cErr.message, step: "choices" }, { status: 500 });

  // Build choices map
  const choicesByQ = new Map<string, { id: string; label: string; is_correct: boolean }[]>();
  for (const ch of choices ?? []) {
    const arr = choicesByQ.get(ch.question_id) ?? [];
    arr.push({ id: ch.id, label: ch.label, is_correct: !!ch.is_correct });
    choicesByQ.set(ch.question_id, arr);
  }

  // 4) Compute incorrect
  const incorrect: Array<{
    questionId: string;
    prompt: string;
    correctChoices: { id: string; label: string }[];
  }> = [];

  for (const q of questions ?? []) {
    const selected = new Set(byQ.get(q.id) ?? []);
    const all = choicesByQ.get(q.id) ?? [];
    const correct = all.filter(c => c.is_correct);
    const correctIds = new Set(correct.map(c => c.id));

    if (correctIds.size === 0) continue; // nothing marked correct → skip
    if (!sameSet(selected, correctIds)) {
      incorrect.push({
        questionId: q.id,
        prompt: q.prompt,
        correctChoices: correct.map(c => ({ id: c.id, label: c.label })),
      });
    }
  }

  return NextResponse.json({ runId: attemptId, incorrect });
}
