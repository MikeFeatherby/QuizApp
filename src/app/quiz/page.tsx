'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import MissedQuestions from '@/components/quiz/MissedQuestions';

type ClientChoice = { id: string; label: string };
type ClientQuestion = { id: string; prompt: string; choices: ClientChoice[] };
type QuizPayload = { attempt_id: string; total: number; questions: ClientQuestion[] };
type Answer = { question_id: string; selected_choice_ids: string[] };

export default function QuizPage() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const [quiz, setQuiz] = useState<QuizPayload | null>(null);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [done, setDone] = useState(false);

  const [grading, setGrading] = useState(false);
  const [score, setScore] = useState(0);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);

  const total = quiz?.total ?? 0;
  const current = quiz?.questions[idx];

  async function startQuiz(e: React.FormEvent) {
    e.preventDefault();
    const player_name = name.trim();
    if (!player_name) return;
    setLoading(true);
    try {
      const res = await fetch('/api/quiz/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_name }),
      });
      const data = (await res.json()) as QuizPayload;
      if (!res.ok) throw new Error((data as any)?.error || 'Failed to start quiz');

      setQuiz(data);
      setIdx(0);
      setSelected(new Set());
      setAnswers([]);
      setDone(false);
      setScore(0);
      setLastCorrect(null);

      // also stash the run id so other pages/components can read it
      try { localStorage.setItem('quiz_run_id', data.attempt_id); } catch {}
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function toggleChoice(choiceId: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(choiceId)) next.delete(choiceId);
      else next.add(choiceId);
      return next;
    });
  }

  async function nextQuestion() {
    if (!quiz || !current || grading) return;
    const picked = Array.from(selected);
    if (picked.length === 0) return;

    setGrading(true);
    try {
      // save locally
      setAnswers(prev => [...prev, { question_id: current.id, selected_choice_ids: picked }]);

      // send to server for grading & scoring
      const res = await fetch('/api/quiz/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attempt_id: quiz.attempt_id,
          question_id: current.id,
          selected_choice_ids: picked,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to record answer');

      setLastCorrect(Boolean(data.correct));
      setScore(Number(data.score ?? 0));

      if (idx + 1 < quiz.total) {
        setIdx(idx + 1);
        setSelected(new Set());
      } else {
        setDone(true);
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setGrading(false);
    }
  }

  // % complete (show 0% until first answer is submitted)
  const answeredCount = done ? total : idx;
  const progressPct = quiz ? Math.round((answeredCount / quiz.total) * 100) : 0;

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-3xl font-bold">Next Quiz</h1>

      {!quiz ? (
        /* START SCREEN */
        <form onSubmit={startQuiz} className="space-y-5">
          <div className="text-sm opacity-80">
            Enter your name to begin. You’ll see one question at a time.
          </div>

          <div className="flex gap-2">
            <input
              className="flex-1 border rounded px-3 py-2"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
              disabled={loading || !name.trim()}
            >
              {loading ? 'Starting…' : 'Start'}
            </button>
          </div>
        </form>
      ) : (
        <>
          {/* PROGRESS + SCORE */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span>{done ? 'Finished' : `Question ${idx + 1} of ${total}`}</span>
              <span>Score: {score}</span>
            </div>
            <Progress value={progressPct} />
          </div>

          {/* QUESTION RUNNER */}
          <div className="min-h-[220px]">
            <AnimatePresence mode="wait">
              {!done && current ? (
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  {lastCorrect !== null && (
                    <div
                      className={`text-sm ${
                        lastCorrect ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {lastCorrect ? 'Correct ✅' : 'Incorrect ❌'}
                    </div>
                  )}

                  <div className="text-lg font-medium">{current.prompt}</div>

                  <ul className="space-y-2">
                    {current.choices.map((c) => {
                      const checked = selected.has(c.id);
                      return (
                        <li key={c.id}>
                          <label className="flex items-center gap-3 border rounded px-3 py-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleChoice(c.id)}
                              disabled={grading}
                            />
                            <span>{c.label}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="pt-2">
                    <button
                      onClick={nextQuestion}
                      className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
                      disabled={grading || selected.size === 0}
                    >
                      {grading
                        ? 'Checking…'
                        : idx + 1 === total
                        ? 'Finish'
                        : 'Next'}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-5"
                >
                  <div className="text-xl font-semibold">Nice work, {name}!</div>
                  <p className="opacity-80">
                    Final score: <strong>{score}</strong> / {total}
                  </p>

                  {/* Missed questions + correct answers on the final screen */}
                  <MissedQuestions runId={quiz.attempt_id} />

                  <div className="flex gap-2">
                    <Link href="/leaderboard" className="px-4 py-2 rounded bg-black text-white">
                      View leaderboard
                    </Link>
                    <button
                      onClick={() => {
                        setQuiz(null);
                        setIdx(0);
                        setSelected(new Set());
                        setAnswers([]);
                        setDone(false);
                        setScore(0);
                        setLastCorrect(null);
                      }}
                      className="px-4 py-2 rounded border"
                    >
                      Play again
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </main>
  );
}
