import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session.isAdmin) {
    redirect("/admin"); // not logged in → send to login
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <p className="opacity-70">
        You’re logged in as <strong>{session.adminEmail}</strong>.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <a href="/admin/questions" className="border rounded p-4 hover:bg-gray-50">
          Manage Questions
        </a>
        <a href="/admin/groups" className="border rounded p-4 hover:bg-gray-50">
          Manage Groups
        </a>
        <a href="/admin/settings" className="border rounded p-4 hover:bg-gray-50">
          Global Settings
        </a>
        <a href="/api/admin/logout" className="border rounded p-4 hover:bg-gray-50">
          Log out
        </a>
      </div>
    </main>
  );
}
