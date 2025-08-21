'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

type Miss = {
  questionId: string;
  prompt: string;
  correctChoices: { id: string; label: string }[];
  selectedChoiceIds: string[];
};

export default function QuizResults() {
  const sp = useSearchParams();
  const router = useRouter();
  const run = (sp.get('run') || '').trim();

  const [loading, setLoading] = useState(true);
  const [missed, setMissed] = useState<Miss[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!run) { setLoading(false); return; }
      const res = await fetch(`/api/quiz/results/${encodeURIComponent(run)}`, { cache: 'no-store' });
      if (!alive) return;
      if (res.ok) {
        const data = await res.json();
        setMissed(data?.incorrect ?? []);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [run]);

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">Your results</h1>

      {/* Friendly intro */}
      <div className="rounded border bg-white p-4">
        <p className="text-sm leading-6">
          Nice work! Our business is <strong>big</strong> and there’s a lot to know — that’s why this quiz exists.
          Below are the questions you didn’t quite get this time, along with the correct answer{(missed.length === 1 ? '' : 's')}.
        </p>
      </div>

      {loading ? (
        <div className="opacity-70">Loading…</div>
      ) : missed.length === 0 ? (
        <div className="rounded border border-dashed p-6 text-center">
          <div className="text-lg font-semibold">Perfect score! 🎉</div>
          <p className="text-sm opacity-80 mt-1">You didn’t miss any questions.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {missed.map((m, i) => (
            <li key={m.questionId} className="rounded border p-4">
              <div className="text-sm opacity-60 mb-1">Question {i + 1}</div>
              <div className="font-medium mb-3">{m.prompt}</div>

              <div className="text-sm">
                <div className="opacity-70">Correct answer{m.correctChoices.length > 1 ? 's' : ''}:</div>
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

      <div className="flex gap-2">
        <button
          onClick={() => router.push('/quiz')}
          className="px-4 py-2 rounded border hover:bg-gray-50"
        >
          Retake quiz
        </button>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 rounded bg-black text-white"
        >
          Go home
        </button>
      </div>
    </main>
  );
}
