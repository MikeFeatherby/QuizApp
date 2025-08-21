import "server-only";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

export type SessionData = {
  isAdmin?: boolean;
  adminEmail?: string;
};

const sessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: "uxquiz_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    httpOnly: true,
    path: "/",
  },
};

export async function getSession() {
  const cookieStore = await cookies();            // 👈 add await
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
