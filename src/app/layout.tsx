// import type { ReactNode } from "react";
// import AdminNav from "@/components/AdminNav";

// export const dynamic = "force-dynamic";

// export default function AdminLayout({ children }: { children: ReactNode }) {
//   return (
//     <>
//       <AdminNav />
//       <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
//     </>
//   );
// }

import "./globals.css";
import type { ReactNode } from "react";
import { Toaster } from "sonner";

export const metadata = {
  title: "UX Quiz",
  description: "Admin + quiz app",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
