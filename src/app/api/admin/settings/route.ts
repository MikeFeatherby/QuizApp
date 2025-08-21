import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET current global settings */
export async function GET() {
  // Ensure there's always a row with id=1
  const { data: existing } = await supabaseServer
    .from("settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (!existing) {
    const { data, error } = await supabaseServer
      .from("settings")
      .upsert({ id: 1 })
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  return NextResponse.json(existing);
}

/** POST to update settings: { num_questions?: number, randomize?: boolean } */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    num_questions?: unknown;
    randomize?: unknown;
  };

  const patch: { id: 1; num_questions?: number; randomize?: boolean } = { id: 1 };

  if (body.num_questions !== undefined) {
    const n = Number(body.num_questions);
    if (!Number.isInteger(n) || n < 1 || n > 200) {
      return NextResponse.json(
        { error: "num_questions must be an integer between 1 and 200" },
        { status: 400 }
      );
    }
    patch.num_questions = n;
  }

  if (body.randomize !== undefined) {
    patch.randomize =
      typeof body.randomize === "string"
        ? body.randomize === "true"
        : Boolean(body.randomize);
  }

  const { data, error } = await supabaseServer
    .from("settings")
    .upsert(patch)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
