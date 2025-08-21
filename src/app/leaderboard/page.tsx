'use client';

import { useEffect, useState } from 'react';

type Attempt = {
  id: string;
  player_name: string;
  score: number;
  total: number;
  created_at: string;
};

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/leaderboard?limit=20', { cache: 'no-store' });
      const data = (await res.json()) as Attempt[];
      setRows(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-3xl font-bold">Leaderboard</h1>

      {loading ? (
        <div className="opacity-70">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="rounded border border-dashed p-6 text-center opacity-70">
          No scores yet — finish a quiz to appear here.
        </div>
      ) : (
        <ol className="space-y-2">
          {rows.map((r, i) => (
            <li
              key={r.id}
              className="flex items-center justify-between border rounded px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-right font-mono">{i + 1}.</span>
                <div>
                  <div className="font-medium">{r.player_name}</div>
                  <div className="text-xs opacity-60">
                    {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="text-sm">
                <span className="font-semibold">{r.score}</span> / {r.total}
              </div>
            </li>
          ))}
        </ol>
      )}

      <div>
        <button
          onClick={load}
          className="mt-2 px-4 py-2 rounded border hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>
    </main>
  );
}
