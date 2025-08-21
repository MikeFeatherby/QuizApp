'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type Settings = { id: 1; num_questions: number; randomize: boolean };

export default function AdminSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [numQuestions, setNumQuestions] = useState<number>(10);
  const [randomize, setRandomize] = useState<boolean>(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load settings');
      const data = (await res.json()) as Settings;
      setNumQuestions(data.num_questions);
      setRandomize(data.randomize);
    } catch (e) {
      toast.error((e as Error).message || 'Error loading settings');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          num_questions: numQuestions,
          randomize,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to save settings');
      }
      toast('Settings saved');
      // optional: refresh data
      await load();
    } catch (e) {
      toast.error((e as Error).message || 'Error saving settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">Global Settings</h1>

      {loading ? (
        <div className="opacity-70">Loading…</div>
      ) : (
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium">
              Number of questions per quiz
            </label>
            <input
              type="number"
              min={1}
              max={200}
              className="w-full border rounded px-3 py-2"
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              required
            />
            <p className="text-xs opacity-70">Between 1 and 200.</p>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={randomize}
              onChange={(e) => setRandomize(e.target.checked)}
            />
            Randomize question order
          </label>

          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save settings'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/admin/dashboard')}
              className="px-4 py-2 rounded border"
            >
              Back to dashboard
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
