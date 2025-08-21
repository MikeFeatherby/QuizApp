'use client';

import { useEffect, useState } from 'react';

type Miss = {
  questionId: string;
  prompt: string;
  correctChoices: { id: string; label: string }[];
};

export default function MissedQuestions({ runId }: { runId?: string }) {
  const [loading, setLoading] = useState(true);
  const [missed, setMissed] = useState<Miss[]>([]);

  // Fallbacks: if runId prop not passed, try ?run=... or localStorage
  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      let id = (runId ?? '').trim();

      if (!id) {
        // query param
        try {
          const url = new URL(window.location.href);
          id = (url.searchParams.get('run') || '').trim();
        } catch {}
      }
      if (!id) {
        // localStorage (set this when you start the quiz)
        try {
          id = (localStorage.getItem('quiz_run_id') || '').trim();
        } catch {}
      }
      if (!id) {
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/quiz/results/${encodeURIComponent(id)}`, { cache: 'no-store' });
      if (!alive) return;
      if (res.ok) {
        const data = await res.json();
        setMissed(data?.incorrect ?? []);
      }
      setLoading(false);
    }

    load();
    return () => { alive = false; };
  }, [runId]);

  return (
    <section className="space-y-4">
      {/* Friendly intro */}
      <div className="rounded border bg-white p-4">
        <p className="text-sm leading-6">
          Great effort! Our business is <strong>big</strong> and there’s a lot to know —
          here are the questions you didn’t quite get this time, with the correct answer
          {missed.length === 1 ? '' : 's'}.
        </p>
      </div>

      {loading ? (
        <div className="opacity-70">Loading…</div>
      ) : missed.length === 0 ? (
        <div className="rounded border border-dashed p-6 text-center">
          <div className="text-lg font-semibold">Perfect score! 🎉</div>
          <p className="text-sm opacity-80 mt-1">No missed questions.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {missed.map((m, i) => (
            <li key={m.questionId} className="rounded border p-4">
              <div className="text-sm opacity-60 mb-1">Question {i + 1}</div>
              <div className="font-medium mb-3">{m.prompt}</div>

              <div className="text-sm">
                <div className="opacity-70">
                  Correct answer{m.correctChoices.length > 1 ? 's' : ''}:
                </div>
                <ul className="list-disc ml-5 mt-1">
                  {m.correctChoices.map((c) => (
                    <li key={c.id}>{c.label}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
