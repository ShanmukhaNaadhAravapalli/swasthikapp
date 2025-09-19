// test-gemini.mjs
// Usage: node --dns-result-order=ipv4first test-gemini.mjs
// Put your service account JSON at .keys/mood-gemini-sa.json

import fs from "fs";
import { GoogleAuth } from "google-auth-library";

async function main() {
  const keyPath = ".keys/mood-gemini-sa.json";
  if (!fs.existsSync(keyPath)) {
    console.error("Missing key file at", keyPath);
    process.exit(1);
  }

  const key = JSON.parse(fs.readFileSync(keyPath, "utf8"));
  console.log("key.project_id:", key.project_id);
  console.log("key.client_email:", key.client_email);

  // Request the generative-language scope (plus cloud-platform as fallback)
  const auth = new GoogleAuth({
    keyFile: keyPath,
    scopes: [
      "https://www.googleapis.com/auth/generative-language",
      "https://www.googleapis.com/auth/cloud-platform",
    ],
  });

  const client = await auth.getClient();
  const tokenResp = await client.getAccessToken();
  const token = typeof tokenResp === "string" ? tokenResp : tokenResp?.token;
  if (!token) {
    console.error("No access token obtained.");
    process.exit(1);
  }

  // print only token head (non-sensitive)
  console.log("token head:", token.substring(0, 30) + "...");

  // tokeninfo (shows scopes/aud/exp)
  try {
    const ti = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(token)}`);
    const j = await ti.json();
    console.log("tokeninfo:", JSON.stringify(j, null, 2));
  } catch (e) {
    console.error("tokeninfo failed:", String(e));
  }

  // Call Gemini generate endpoint (small probe)
  try {
    const resp = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Say one sentence with quote said by indian" }] }],
          generationConfig: {
            maxOutputTokens: 40,
          },
        }),
      }
    );

    console.log("Gemini HTTP status:", resp.status);
    const body = await resp.json().catch(() => null);

    if (!resp.ok) {
      console.log("Gemini error:", JSON.stringify(body?.error ?? body, null, 2));
    } else {
      // extract text safely
      const cand = body?.candidates?.[0] ?? body?.outputs?.[0] ?? null;
      const text =
        cand?.content?.parts?.[0]?.text ??
        cand?.content ??
        cand?.output ??
        (typeof body?.text === "string" ? body.text : null);

      console.log("Generated (short):", (text?.slice?.(0, 400) ?? String(text)).replace(/\n/g, " "));
    }
  } catch (e) {
    console.error("Gemini request failed:", String(e));
  }
}

main().catch((e) => {
  console.error("Script error:", e);
  process.exit(1);
});
