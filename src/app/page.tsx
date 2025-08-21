import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl p-8 space-y-8">
      <header className="space-y-2">
        <h1 className="text-4xl font-bold">UX Quiz</h1>
        <p className="opacity-70">Take the quiz or check the leaderboard.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/quiz"
          className="block rounded border p-6 hover:bg-gray-50 transition"
        >
          <div className="text-2xl mb-2">🧠</div>
          <div className="font-semibold">Start Quiz</div>
          <p className="text-sm opacity-70">One question at a time.</p>
        </Link>

        <Link
          href="/leaderboard"
          className="block rounded border p-6 hover:bg-gray-50 transition"
        >
          <div className="text-2xl mb-2">🏆</div>
          <div className="font-semibold">Leaderboard</div>
          <p className="text-sm opacity-70">Top scores and recent runs.</p>
        </Link>
      </div>
    </main>
  );
}
