// lib/safeGetSession.ts (server-side)
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Return the current session or null.
 * This converts Next.js ReadonlyHeaders -> standard Headers before calling auth.api.getSession
 * to satisfy TypeScript and the auth library's expected parameter shape.
 */
export async function safeGetSession() {
  // Next.js server: headers() may be async in some environments
  const incoming = await headers(); // ReadonlyHeaders

  // Convert ReadonlyHeaders -> standard Headers instance
  const headersForAuth = new Headers();
  for (const [key, value] of Array.from(incoming.entries())) {
    // value may be string | string[] | undefined depending on runtime; normalize to string
    if (Array.isArray(value)) {
      for (const v of value) headersForAuth.append(key, String(v));
    } else if (value !== undefined) {
      headersForAuth.append(key, String(value));
    }
  }

  // Debug logs (server-side)
  console.log("safeGetSession - headers keys:", Array.from(headersForAuth.keys()));
  const cookiePresent = Boolean(headersForAuth.get("cookie"));
  console.log("safeGetSession - cookie present:", cookiePresent);

  try {
    // Call using the Headers instance (this matches the expected type)
    const session = await auth.api.getSession({ headers: headersForAuth as unknown as Headers });
    if (session) {
      console.log("safeGetSession - got session userId:", session.user?.id ?? null);
      return session;
    }

    // If your auth lib also supports a cookie-only shape but types don't declare it,
    // you could attempt a runtime-only call using `as any` (uncomment if needed):
    // const cookie = headersForAuth.get("cookie") ?? "";
    // const session2 = await (auth.api.getSession as any)({ cookie });
    // return session2 ?? null;

    return null;
  } catch (e) {
    console.error("safeGetSession - auth.api.getSession error:", e);
    return null;
  }
}
