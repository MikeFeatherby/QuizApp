import type { ReactNode } from "react";
import AdminNav from "@/components/AdminNav";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AdminNav />
      <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
    </>
  );
}
