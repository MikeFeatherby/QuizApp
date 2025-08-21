'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type Question = { id: string; prompt: string; created_at: string };
type Choice = { id: string; label: string; is_correct: boolean; question_id: string };
type Group = { id: string; name: string; created_at: string };

/* ========================= Page ========================= */

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const [drawer, setDrawer] = useState<
    | null
    | { mode: 'create' }
    | { mode: 'manage'; question: Question; tab?: 'groups' | 'choices' }
  >(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/questions', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load questions');
      const data = (await res.json()) as Question[];
      setQuestions(data);
    } catch (e) {
      toast.error((e as Error).message || 'Error loading questions');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Questions</h1>
        <button
          onClick={() => setDrawer({ mode: 'create' })}
          className="px-4 py-2 rounded bg-black text-white"
        >
          Create
        </button>
      </div>

      {/* List (no header row) */}
      <div className="border rounded divide-y">
        {loading ? (
          <div className="px-3 py-6 text-sm opacity-70">Loading…</div>
        ) : questions.length ? (
          <ul>
            {questions.map((q) => (
              <QuestionRow
                key={q.id}
                q={q}
                onOpenGroups={() => setDrawer({ mode: 'manage', question: q, tab: 'groups' })}
                onOpenChoices={() => setDrawer({ mode: 'manage', question: q, tab: 'choices' })}
              />
            ))}
          </ul>
        ) : (
          <div className="px-3 py-10 text-center text-sm opacity-70">
            No questions yet — click <span className="font-medium">Create</span> to add one.
          </div>
        )}
      </div>

      {/* Drawers */}
      {drawer?.mode === 'create' ? (
        <CreateDrawer
          onClose={() => setDrawer(null)}
          onCreated={() => {
            setDrawer(null);
            load();
          }}
        />
      ) : null}

      {drawer?.mode === 'manage' ? (
        <ManageDrawer
          question={drawer.question}
          defaultTab={drawer.tab}
          onClose={() => setDrawer(null)}
          onChanged={load}
        />
      ) : null}
    </main>
  );
}

/* ========================= Row ========================= */

function QuestionRow({
  q,
  onOpenGroups,
  onOpenChoices,
}: {
  q: Question;
  onOpenGroups: () => void;
  onOpenChoices: () => void;
}) {
  const [groups, setGroups] = useState<Group[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetch(`/api/admin/questions/${q.id}/groups`, { cache: 'no-store' });
      if (!alive) return;
      if (res.ok) setGroups((await res.json()) as Group[]);
      else setGroups([]);
    })();
    return () => {
      alive = false;
    };
  }, [q.id]);

  return (
    <li className="flex items-center gap-3 px-3 py-3 border-b">
      {/* Left: question text (truncate) */}
      <div className="flex-1 min-w-0">
        <div className="truncate" title={q.prompt}>
          {q.prompt}
        </div>
      </div>

      {/* Right: groups + actions (same row, right-aligned) */}
      <div className="shrink-0 flex items-center gap-3">
        {/* Group badges */}
        <div className="flex items-center gap-2">
          {groups && groups.length ? (
            groups.map((g) => (
              <button
                key={g.id}
                onClick={onOpenGroups}
                className="text-xs rounded border px-2 py-0.5 hover:bg-gray-50"
                title={g.name}
              >
                {abbr(g.name)}
              </button>
            ))
          ) : (
            <button
              onClick={onOpenGroups}
              className="text-xs hover:opacity-100"
              title="Link groups"
            >
              Loading
            </button>
          )}
        </div>

        {/* Actions */}
        <button
          onClick={onOpenChoices}
          className="text-sm rounded border px-2 hover:opacity-100"
          title="Manage choices"
        >
          Choices
        </button>
      </div>
    </li>
  );
}

function abbr(name: string) {
  return name.trim().slice(0, 3).toUpperCase();
}

/* ========================= Drawer base ========================= */

function Drawer({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/30 z-40" aria-hidden />
      <div
        className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-white z-50 shadow-xl border-l flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="text-sm underline opacity-80 hover:opacity-100">
            Close
          </button>
        </div>
        <div className="p-4 overflow-auto">{children}</div>
      </div>
    </>
  );
}

/* --------------------- Create Drawer --------------------- */

function CreateDrawer({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [prompt, setPrompt] = useState('');
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/admin/groups', { cache: 'no-store' });
      if (res.ok) setAllGroups((await res.json()) as Group[]);
    })();
  }, []);

  function toggleGroup(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const text = prompt.trim();
    if (!text) return;

    setSubmitting(true);
    try {
      // 1) create question
      const res = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      });
      const created = await res.json();
      if (!res.ok) throw new Error(created?.error || 'Failed to create question');

      // 2) link groups
      const qid = created.id as string;
      for (const gid of selected) {
        const link = await fetch(`/api/admin/questions/${qid}/groups`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ group_id: gid }),
        });
        if (!link.ok) {
          const d = await link.json().catch(() => ({}));
          throw new Error(d?.error || 'Failed to link group');
        }
      }

      toast('Question created');
      onCreated();
    } catch (e) {
      toast.error((e as Error).message || 'Error creating question');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer title="Create question" onClose={onClose}>
      <form onSubmit={create} className="space-y-4">
        <label className="block text-sm">
          Prompt
          <textarea
            className="mt-1 w-full border rounded px-3 py-2 min-h-[120px]"
            placeholder="Type the question here…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </label>

        <fieldset className="border rounded p-3">
          <legend className="text-sm px-1">Groups (optional)</legend>
          {allGroups.length ? (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {allGroups.map((g) => {
                const checked = selected.has(g.id);
                return (
                  <li key={g.id}>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleGroup(g.id)}
                      />
                      <span>{g.name}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-sm opacity-70">No groups yet.</div>
          )}
        </fieldset>

        <div className="flex items-center gap-2">
          <button
            className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
            disabled={submitting || !prompt.trim()}
          >
            {submitting ? 'Creating…' : 'Create'}
          </button>
          <button type="button" onClick={onClose} className="text-sm underline opacity-80 hover:opacity-100">
            Cancel
          </button>
        </div>
      </form>
    </Drawer>
  );
}

/* --------------------- Manage Drawer --------------------- */

function ManageDrawer({
  question,
  defaultTab = 'groups',
  onClose,
  onChanged,
}: {
  question: Question;
  defaultTab?: 'groups' | 'choices' | 'edit';
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [tab, setTab] = useState<'groups' | 'choices' | 'edit'>(defaultTab);
  const [prompt, setPrompt] = useState(question.prompt);
  const [saving, setSaving] = useState(false);

  // keep local prompt in sync if a different question is selected
  useEffect(() => {
    setPrompt(question.prompt);
  }, [question.id, question.prompt]);

  const dirty = prompt.trim() !== (question.prompt ?? '').trim();

  async function savePrompt() {
    if (!dirty) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/questions/${question.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to update question');
      toast('Question updated');
      onChanged?.(); // refresh the list so the row text updates
    } catch (e) {
      toast.error((e as Error).message || 'Error updating question');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer title="Manage question" onClose={() => { onClose(); onChanged?.(); }}>
      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setTab('edit')}
          className={`text-sm rounded border px-3 py-1 ${tab === 'edit' ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'}`}
        >
          Question
        </button>
        <button
          onClick={() => setTab('groups')}
          className={`text-sm rounded border px-3 py-1 ${tab === 'groups' ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'}`}
        >
          Groups
        </button>
        <button
          onClick={() => setTab('choices')}
          className={`text-sm rounded border px-3 py-1 ${tab === 'choices' ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'}`}
        >
          Choices
        </button>
      </div>

      {tab === 'edit' && (
        <div className="space-y-3">
          <label className="block text-sm">
            Prompt
            <textarea
              className="mt-1 w-full border rounded px-3 py-2 min-h-[120px]"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={savePrompt}
              disabled={!dirty || saving}
              className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Update'}
            </button>
            <button
              type="button"
              onClick={() => setPrompt(question.prompt)}
              className="text-sm underline opacity-80 hover:opacity-100"
              title="Reset to saved text"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {tab === 'groups' ? (
        <GroupsPanel questionId={question.id} />
      ) : null}

      {tab === 'choices' ? (
        <ChoicesPanel questionId={question.id} />
      ) : null}
    </Drawer>
  );
}

/* =================== Groups Panel (reused) =================== */

function GroupsPanel({ questionId }: { questionId: string }) {
  const [linked, setLinked] = useState<Group[] | null>(null);
  const [allGroups, setAllGroups] = useState<Group[] | null>(null);
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([
        fetch(`/api/admin/questions/${questionId}/groups`, { cache: 'no-store' }),
        fetch('/api/admin/groups', { cache: 'no-store' }),
      ]);
      if (!a.ok) throw new Error('Failed to load linked groups');
      if (!b.ok) throw new Error('Failed to load groups');
      setLinked((await a.json()) as Group[]);
      const all = (await b.json()) as Group[];
      setAllGroups(all);
      if (all.length && !selected) setSelected(all[0].id);
    } catch (e) {
      toast.error((e as Error).message || 'Error loading groups');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function linkSelected(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setWorking(true);
    try {
      const res = await fetch(`/api/admin/questions/${questionId}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: selected }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to link group');
      }
      toast('Group linked');
      await load();
    } catch (e) {
      toast.error((e as Error).message || 'Error linking group');
    } finally {
      setWorking(false);
    }
  }

  async function unlink(groupId: string) {
    setWorking(true);
    try {
      const res = await fetch(
        `/api/admin/questions/${questionId}/groups?group_id=${encodeURIComponent(groupId)}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to unlink group');
      }
      toast('Group unlinked');
      await load();
    } catch (e) {
      toast.error((e as Error).message || 'Error unlinking group');
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={linkSelected} className="flex flex-wrap items-center gap-2">
        <select
          className="border rounded px-3 py-2"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {(allGroups ?? []).map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <button
          className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
          disabled={working || !selected}
        >
          {working ? 'Working…' : 'Link'}
        </button>
      </form>

      {loading ? (
        <div className="opacity-70 text-sm">Loading linked groups…</div>
      ) : linked && linked.length ? (
        <ul className="space-y-1">
          {linked.map((g) => (
            <li key={g.id} className="flex items-center justify-between rounded border px-3 py-2">
              <span>{g.name}</span>
              <button
                onClick={() => unlink(g.id)}
                className="text-xs underline opacity-80 hover:opacity-100"
                disabled={working}
              >
                Unlink
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded border border-dashed p-3 text-center text-sm opacity-70">
          No groups linked yet.
        </div>
      )}
    </div>
  );
}

/* =================== Choices Panel (reused) =================== */

function ChoicesPanel({ questionId }: { questionId: string }) {
  const [choices, setChoices] = useState<Choice[] | null>(null);
  const [loading, setLoading] = useState(true);

  const [newLabel, setNewLabel] = useState('');
  const [newCorrect, setNewCorrect] = useState(false);
  const [adding, setAdding] = useState(false);

  const [labels, setLabels] = useState<Record<string, string>>({});
  const [correct, setCorrect] = useState<Record<string, boolean>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/questions/${questionId}/choices`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load choices');
      const data = (await res.json()) as Choice[];
      setChoices(data);
      const mLabel: Record<string, string> = {};
      const mCorrect: Record<string, boolean> = {};
      for (const c of data) {
        mLabel[c.id] = c.label;
        mCorrect[c.id] = c.is_correct;
      }
      setLabels(mLabel);
      setCorrect(mCorrect);
    } catch (e) {
      toast.error((e as Error).message || 'Error loading choices');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addChoice(e: React.FormEvent) {
    e.preventDefault();
    const text = newLabel.trim();
    if (!text) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/admin/questions/${questionId}/choices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: text, is_correct: newCorrect }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to add choice');
      }
      setNewLabel('');
      setNewCorrect(false);
      toast('Choice added');
      await load();
    } catch (e) {
      toast.error((e as Error).message || 'Error adding choice');
    } finally {
      setAdding(false);
    }
  }

  function changed(id: string) {
    const orig = choices?.find((c) => c.id === id);
    if (!orig) return false;
    return (labels[id] ?? '') !== orig.label || Boolean(correct[id]) !== Boolean(orig.is_correct);
  }

  async function saveChoice(id: string) {
    if (!changed(id)) return;
    setSavingId(id);
    try {
      const res = await fetch(`/api/admin/choices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: labels[id], is_correct: correct[id] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to update choice');
      setChoices((prev) => (prev ?? []).map((c) => (c.id === id ? (data as Choice) : c)));
      toast('Choice updated');
    } catch (e) {
      toast.error((e as Error).message || 'Error updating choice');
    } finally {
      setSavingId(null);
    }
  }

  async function deleteChoice(id: string) {
    const ok = confirm('Delete this choice?');
    if (!ok) return;
    setDeletingId(id);
    const prev = choices ?? [];
    setChoices(prev.filter((c) => c.id !== id));
    try {
      const res = await fetch(`/api/admin/choices/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to delete choice');
      }
      toast('Choice deleted');
      setLabels((m) => { const { [id]: _, ...rest } = m; return rest; });
      setCorrect((m) => { const { [id]: _, ...rest } = m; return rest; });
    } catch (e) {
      toast.error((e as Error).message || 'Error deleting choice');
      setChoices(prev); // rollback
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={addChoice} className="flex flex-wrap items-center gap-2 px-3 py-2 border background-gray-50">
        
          <input
          className="w-full border rounded px-3 py-2"
          placeholder="Choice label…"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
        />
        
        <label className="flex items-center gap-2 text-sm" title="Correct answer">
          <input
            type="checkbox"
            checked={newCorrect}
            onChange={(e) => setNewCorrect(e.target.checked)}
          />
          Correct
        </label>
        <button
          className="w-full px-3 py-2 rounded bg-black text-white disabled:opacity-50"
          disabled={adding || !newLabel.trim()}
        >
          {adding ? 'Adding…' : 'Add'}
        </button>
        
      </form>

      {loading ? (
        <div className="opacity-70 text-sm">Loading choices…</div>
      ) : choices && choices.length ? (
        <ul className="space-y-2">
          {choices.map((c) => {
            const dirty = changed(c.id);
            return (
              <li key={c.id} className="flex flex-wrap items-center gap-2 ">
                <input
                  className="w-full border rounded px-3 py-2"
                  value={labels[c.id] ?? ''}
                  onChange={(e) => setLabels((m) => ({ ...m, [c.id]: e.target.value }))}
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!correct[c.id]}
                    onChange={(e) =>
                      setCorrect((m) => ({ ...m, [c.id]: e.target.checked }))
                    }
                  />
                  
                </label>

                <button
                  onClick={() => saveChoice(c.id)}
                  disabled={savingId === c.id || !dirty}
                  className="text-sm underline disabled:opacity-50"
                >
                  {savingId === c.id ? 'Saving…' : 'Update'}
                </button>

                <button
                  onClick={() => deleteChoice(c.id)}
                  disabled={deletingId === c.id}
                  className="text-sm underline opacity-80 hover:opacity-100"
                >
                  {deletingId === c.id ? 'Deleting…' : 'Delete'}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded border border-dashed p-3 text-center text-sm opacity-70">
          No choices yet — add one above.
        </div>
      )}
    </div>
  );
}
