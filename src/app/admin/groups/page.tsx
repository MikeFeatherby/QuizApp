'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type Group = { id: string; name: string; created_at: string };

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/groups', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load groups');
      const data = (await res.json()) as Group[];
      setGroups(data);
    } catch (e) {
      toast.error((e as Error).message || 'Error loading groups');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addGroup(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to add group');
      }
      setName('');
      toast('Group added');
      await load();
    } catch (e) {
      toast.error((e as Error).message || 'Error adding group');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">Groups</h1>

      <form onSubmit={addGroup} className="flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2"
          placeholder="New group name (e.g., Accessibility)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
          disabled={submitting || !name.trim()}
        >
          {submitting ? 'Adding…' : 'Add'}
        </button>
      </form>

      {loading ? (
        <div className="opacity-70">Loading…</div>
      ) : groups.length ? (
        <ul className="space-y-2">
          {groups.map((g) => (
            <li key={g.id} className="border rounded p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{g.name}</div>
                <div className="text-xs opacity-60">
                  {new Date(g.created_at).toLocaleString()}
                </div>
              </div>
              {/* delete/edit coming later */}
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded border border-dashed p-6 text-center opacity-70">
          No groups yet — add one above.
        </div>
      )}
    </main>
  );
}
