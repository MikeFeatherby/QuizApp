import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function POST(req: NextRequest) {
  // Body: { player_name: string, group_ids?: string[] }
  const body = (await req.json().catch(() => ({}))) as {
    player_name?: string;
    group_ids?: string[];
  };

  const playerName = (body.player_name ?? "").toString().trim();
  const groupIds = Array.isArray(body.group_ids) ? body.group_ids : undefined;

  if (!playerName) {
    return NextResponse.json({ error: "player_name is required" }, { status: 400 });
  }

  // 1) Load global settings
  const { data: settings, error: settingsErr } = await supabaseServer
    .from("settings")
    .select("num_questions, randomize")
    .eq("id", 1)
    .maybeSingle();

  if (settingsErr) {
    return NextResponse.json({ error: settingsErr.message }, { status: 500 });
  }

  const NUM = settings?.num_questions ?? 10;
  const RANDOMIZE = settings?.randomize ?? true;

  // 2) Find candidate question IDs (optionally filtered by groups)
  let candidateIds: string[] = [];

  if (groupIds && groupIds.length) {
    const { data: links, error: linkErr } = await supabaseServer
      .from("question_groups")
      .select("question_id")
      .in("group_id", groupIds);

    if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 });
    candidateIds = Array.from(new Set((links ?? []).map((r) => r.question_id)));
  } else {
    const { data: qs, error: qErr } = await supabaseServer
      .from("questions")
      .select("id")
      .order("created_at", { ascending: true }); // sequential baseline
    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
    candidateIds = (qs ?? []).map((q) => q.id);
  }

  if (candidateIds.length === 0) {
    return NextResponse.json({ error: "No questions available" }, { status: 400 });
  }

  // 3) Pull the full question records for those IDs
  const { data: questions, error: qFullErr } = await supabaseServer
    .from("questions")
    .select("id, prompt, created_at")
    .in("id", candidateIds);

  if (qFullErr) return NextResponse.json({ error: qFullErr.message }, { status: 500 });

  // 4) Order + slice by settings
  let ordered = [...(questions ?? [])];
  if (RANDOMIZE) {
    shuffle(ordered);
  } else {
    // sequential = by created_at ascending (stable for everyone)
    ordered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }
  const picked = ordered.slice(0, Math.min(NUM, ordered.length));
  const pickedIds = picked.map((q) => q.id);

  // 5) Load choices for the picked questions
  const { data: choices, error: cErr } = await supabaseServer
    .from("choices")
    .select("id, label, is_correct, question_id")
    .in("question_id", pickedIds);

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  // Group choices by question id, and DO NOT expose correctness in client payload
  const byQ = new Map<string, { id: string; label: string; is_correct: boolean }[]>();
  for (const c of choices ?? []) {
    const arr = byQ.get(c.question_id) ?? [];
    arr.push({ id: c.id, label: c.label, is_correct: c.is_correct });
    byQ.set(c.question_id, arr);
  }

  // Optionally shuffle choices for each question to avoid order bias
  const clientQuestions = picked.map((q) => {
    const ch = [...(byQ.get(q.id) ?? [])];
    shuffle(ch);
    return {
      id: q.id,
      prompt: q.prompt,
      choices: ch.map(({ id, label }) => ({ id, label })), // hide correctness
    };
  });

  const total = clientQuestions.length;

  // 6) Create an attempt row (score starts at 0; total set now)
  const { data: attempt, error: aErr } = await supabaseServer
    .from("attempts")
    .insert({ player_name: playerName, score: 0, total })
    .select("id")
    .single();

  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

  // 7) Return quiz payload (attempt_id + questions without answers)
  return NextResponse.json({
    attempt_id: attempt!.id,
    total,
    questions: clientQuestions,
  });
}
