// app/api/mood/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { mood } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, gte, lte } from "drizzle-orm";
import { GoogleAuth } from "google-auth-library";

/* ----------------- Env names / defaults ----------------- */
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";

/** Day range in Asia/Kolkata */
function getKolkataDayRange(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const day = `${map.year}-${map.month}-${map.day}`;
  const start = new Date(`${day}T00:00:00+05:30`);
  const end = new Date(`${day}T23:59:59.999+05:30`);
  return { start, end };
}

/** safeGetSession */
async function safeGetSession(headers: Headers) {
  const hdrObj: Record<string, string> = {};
  for (const [k, v] of Array.from(headers.entries())) hdrObj[k] = v;

  const cookie = headers.get("cookie") ?? "";
  try {
    if (cookie) {
      const s = await auth.api.getSession?.({ cookie } as any);
      if (s) return { ok: true, session: s };
    }
  } catch (e: any) {
    console.error("safeGetSession cookie attempt failed:", e?.message ?? e);
  }

  try {
    const s = await auth.api.getSession?.({ headers: hdrObj } as any);
    if (s) return { ok: true, session: s };
  } catch (e: any) {
    console.error("safeGetSession headers attempt failed:", e?.message ?? e);
    return { ok: false, error: e?.message ?? String(e) };
  }

  return { ok: false, error: "No session found" };
}

/** map mood score -> credits */
function scoreToCredits(score: number): number {
  switch (score) {
    case 1: return 0;
    case 2: return 1;
    case 3: return 3;
    case 4: return 3;
    case 5: return 5;
    default: return 0;
  }
}

/** Helper: normalize possible HF shapes into an array of {label, score} */
function normalizeLabelScoreArray(obj: any): Array<{ label?: string; score?: number }> {
  if (!obj) return [];

  if (Array.isArray(obj) && obj.length === 1 && Array.isArray(obj[0])) {
    obj = obj[0];
  }

  const out: Array<{ label?: string; score?: number }> = [];

  if (Array.isArray(obj)) {
    for (const it of obj) {
      if (!it) continue;
      if (typeof it === "object" && ("label" in it || "score" in it)) {
        out.push({ label: it.label, score: it.score });
        continue;
      }
      if (it && Array.isArray(it.outputs)) {
        for (const o of it.outputs) {
          if (o && (o.label || o.score !== undefined)) out.push({ label: o.label, score: o.score });
        }
      }
    }
    if (out.length) return out;
  }

  if (obj && Array.isArray(obj.outputs)) {
    for (const o of obj.outputs) if (o) out.push({ label: o.label, score: o.score });
    if (out.length) return out;
  }

  if (obj && Array.isArray(obj.choices)) {
    for (const c of obj.choices) {
      if (!c) continue;
      if (typeof c === "string") out.push({ label: c, score: undefined });
      else if (c.text || c.message?.content) out.push({ label: c.text ?? c.message?.content, score: c.score });
    }
    if (out.length) return out;
  }

  if (obj && (obj.label || obj.score !== undefined)) {
    return [{ label: obj.label, score: obj.score }];
  }

  return out;
}

/* ----------------- Call tabularisai (HF sentiment) - REMOVED in favor of Google NL ----------------- */
/* (previous HF helper removed) */

/* ----------------- Call Google Cloud Natural Language API for sentiment ----------------- */
async function getGoogleNLPSentiment(text: string) {
  // We'll use the same credential pattern as your Gemini helper: prefer service account from env,
  // otherwise rely on ADC (GOOGLE_APPLICATION_CREDENTIALS or metadata).
  let auth: GoogleAuth;
  try {
    const svcJson = process.env.GCP_SERVICE_ACCOUNT;
    if (svcJson) {
      let creds;
      try {
        creds = JSON.parse(svcJson);
      } catch {
        throw new Error("Invalid JSON in GCP_SERVICE_ACCOUNT env var");
      }
      auth = new GoogleAuth({
        credentials: creds,
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      });
    } else {
      auth = new GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      });
    }

    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const token = typeof tokenResponse === "string" ? tokenResponse : tokenResponse?.token;
    if (!token) throw new Error("Failed to obtain access token for Google Natural Language API");

    const url = `https://language.googleapis.com/v1/documents:analyzeSentiment`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);

    const body = {
      document: {
        type: "PLAIN_TEXT",
        content: text,
      },
      encodingType: "UTF8",
    };

    try {
      const resp = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      clearTimeout(timer);

      const ct = resp.headers.get("content-type") ?? "";
      let json: any = null;
      if (ct.includes("application/json")) json = await resp.json().catch(() => null);
      else {
        const txt = await resp.text().catch(() => "");
        try { json = JSON.parse(txt); } catch { json = txt; }
      }

      if (!resp.ok) {
        return { score: 3, confidence: 0.2, raw: json, error: `HTTP ${resp.status}` };
      }

      // expected shape:
      // {
      //   documentSentiment: { score: -1..1, magnitude: >=0 },
      //   language: "en",
      //   sentences: [...]
      // }
      const docSent = json?.documentSentiment;
      if (!docSent || typeof docSent.score !== "number") {
        return { score: 3, confidence: 0.2, raw: json };
      }

      const rawScore: number = docSent.score; // -1 .. 1
      const magnitude: number = typeof docSent.magnitude === "number" ? docSent.magnitude : 0;

      // Map -1..1 to 1..5: formula -> Math.round(((rawScore + 1) / 2) * 4) + 1
      const mapped = Math.round(((rawScore + 1) / 2) * 4) + 1;
      const score = Math.max(1, Math.min(5, mapped));

      // Confidence heuristic: combine absolute polarity and magnitude into 0..1
      // - abs(rawScore) shows polarity strength, magnitude shows overall intensity.
      // This is heuristic and not an official "confidence".
      const polarityStrength = Math.min(1, Math.abs(rawScore)); // 0..1
      const magnitudeFactor = 1 - Math.exp(-magnitude); // 0..1, grows with magnitude
      const confidence = Math.max(0.01, Math.min(1, (polarityStrength * 0.7) + (magnitudeFactor * 0.3)));

      return { score, confidence: Number(confidence.toFixed(3)), raw: json };
    } catch (e: any) {
      clearTimeout(timer);
      console.error("Google NLP request exception:", e?.message ?? e);
      return { score: 3, confidence: 0.2, raw: { error: String(e) } };
    }
  } catch (e: any) {
    console.error("getGoogleNLPSentiment setup failed:", e?.message ?? e);
    return { score: 3, confidence: 0.2, raw: { error: String(e) } };
  }
}

/* ----------------- GET (debug) ----------------- */
export async function GET(request: Request) {
  const dev = process.env.NODE_ENV !== "production";
  const { ok, session, error } = await safeGetSession(request.headers);
  return NextResponse.json({
    dev,
    gcpCredsSet: Boolean(process.env.GCP_SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS),
    geminiKeySet: Boolean(process.env.GCP_SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS),
    session: dev ? { ok, session: session ?? undefined, error: error ?? undefined } : undefined,
  });
}

/* ----------------- Helper: robust Gemini text extractor ----------------- */
function extractTextFromGeminiJson(json: any): string | null {
  if (!json) return null;

  // 1) top-level text
  if (typeof json.text === "string" && json.text.trim()) return json.text.trim();

  // 2) outputs array with content.parts
  if (Array.isArray(json.outputs) && json.outputs.length > 0) {
    const out0 = json.outputs[0];
    // outputs[].content.parts[0].text
    if (out0?.content && Array.isArray(out0.content) && out0.content[0]?.parts) {
      const parts = out0.content[0].parts;
      if (Array.isArray(parts) && parts[0]?.text) return String(parts.map((p: any) => p.text).join("\n")).trim();
    }
    // outputs[0].content?.text
    if (out0?.content?.text) return String(out0.content.text).trim();
    // outputs[0].text
    if (out0?.text) return String(out0.text).trim();
  }

  // 3) candidates[]
  if (Array.isArray(json.candidates) && json.candidates.length > 0) {
    const cand = json.candidates[0];

    // a) candidate.content as string
    if (typeof cand.content === "string" && cand.content.trim()) return cand.content.trim();

    // b) candidate.content is array of blocks
    if (Array.isArray(cand.content) && cand.content.length > 0) {
      // join pieces intelligently
      const partsText: string[] = [];
      for (const block of cand.content) {
        if (!block) continue;
        // block.parts -> [{ text }]
        if (Array.isArray(block.parts) && block.parts.length > 0) {
          for (const p of block.parts) {
            if (p?.text) partsText.push(String(p.text));
          }
          continue;
        }
        // block.text
        if (block.text) {
          partsText.push(String(block.text));
          continue;
        }
        // block may be {type, content: {text}}
        if (block.content?.text) {
          partsText.push(String(block.content.text));
          continue;
        }
        // block may itself be a string
        if (typeof block === "string") partsText.push(block);
      }
      if (partsText.length) return partsText.join("\n").trim();
    }

    // c) candidate.content as object with parts
    if (cand.content && cand.content.parts && Array.isArray(cand.content.parts) && cand.content.parts[0]?.text) {
      return String(cand.content.parts.map((p: any) => p.text).join("\n")).trim();
    }

    // d) candidate.output
    if (typeof cand.output === "string" && cand.output.trim()) return cand.output.trim();

    // e) candidate.message?.content
    if (cand.message?.content && typeof cand.message.content === "string") return cand.message.content.trim();
  }

  // 4) generic fallbacks
  if (typeof json.output === "string" && json.output.trim()) return json.output.trim();
  if (typeof json.content === "string" && json.content.trim()) return json.content.trim();

  return null;
}

/* ----------------- Helper: call Gemini (robust payload attempts) ----------------- */
async function callGeminiGenerate(userPrompt: string) {
  const svcJson = process.env.GCP_SERVICE_ACCOUNT;
  const model = process.env.GEMINI_MODEL ?? GEMINI_MODEL;

  console.log("Using Gemini model:", model);

  let auth: GoogleAuth;
  if (svcJson) {
    let creds;
    try {
      creds = JSON.parse(svcJson);
    } catch {
      throw new Error("Invalid JSON in GCP_SERVICE_ACCOUNT env var");
    }
    auth = new GoogleAuth({
      credentials: creds,
      scopes: [
        "https://www.googleapis.com/auth/generative-language",
        "https://www.googleapis.com/auth/cloud-platform",
      ],
    });
  } else {
    auth = new GoogleAuth({
      scopes: [
        "https://www.googleapis.com/auth/generative-language",
        "https://www.googleapis.com/auth/cloud-platform",
      ],
    });
  }

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = typeof tokenResponse === "string" ? tokenResponse : tokenResponse?.token;
  if (!token) throw new Error("Failed to obtain access token for Gemini");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  // Two payload variants we will try (snake_case then camelCase).
  const payloads = [
    // 1) snake_case variant
    {
      generationConfig: { max_output_tokens: 120, temperature: 0.7, top_p: 0.95 },
      contents: [{ parts: [{ text: userPrompt }] }],
    },
    // 2) camelCase variant
    {
      generationConfig: { maxOutputTokens: 120, temperature: 0.7, topP: 0.95 },
      contents: [{ parts: [{ text: userPrompt }] }],
    },
  ];

  let lastError: any = null;
  for (const payload of payloads) {
    try {
      console.log("Attempting Gemini payload:", JSON.stringify(payload));
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const ct = resp.headers.get("content-type") ?? "";
      const json = ct.includes("application/json") ? await resp.json().catch(() => null) : await resp.text().catch(() => null);

      if (!resp.ok) {
        const msg = (json && json.error && json.error.message) ? json.error.message : JSON.stringify(json);
        console.warn("Gemini attempt failed:", resp.status, msg);
        if (resp.status === 400 && /unknown name/i.test(String(msg))) {
          lastError = { status: resp.status, body: json };
          continue; // try next payload
        }
        return { text: null, raw: json, error: `HTTP ${resp.status}` };
      }

      // success -> extract text robustly
      const extracted = extractTextFromGeminiJson(json);
      if (extracted) return { text: extracted, raw: json };

      // if no extracted text, still return raw so caller can inspect
      return { text: null, raw: json };
    } catch (e: any) {
      console.error("Gemini request exception:", e?.message ?? e);
      lastError = e;
      // try next payload
    }
  }

  return { text: null, raw: lastError, error: "All payload attempts failed" };
}

/* ----------------- POST (create mood) ----------------- */
export async function POST(request: Request) {
  const { ok, session } = await safeGetSession(request.headers);
  if (!ok || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await request.json().catch(() => null);
  if (!body?.moodText) return NextResponse.json({ error: "moodText is required" }, { status: 400 });

  const moodText = body.moodText.trim();
  const { start, end } = getKolkataDayRange();
  const existing = await db.select().from(mood)
    .where(and(eq(mood.userId, userId), gte(mood.createdAt, start), lte(mood.createdAt, end)));
  if (existing.length) return NextResponse.json({ error: "Mood already entered today" }, { status: 409 });

  const userPrompt = `User mood: "${moodText}". 
Find a famous quote (said by a well-known historical or contemporary any Indian person) that best matches this mood.
Respond ONLY in this format:

"Quote text" — Author Name
-it should generate like according the user mood and those generated codes should bring impact to the user
Rules:
1. The quote MUST be real and verifiable. Do NOT invent quotes.
2. Prefer concise, impactful quotes (6–16 words) that match the mood: for sadness pick motivating/hopeful lines, for anxiety pick calming lines, for happiness pick uplifting lines.
3. Do NOT restrict to freedom fighters — consider artists, scientists, athletes, writers, entrepreneurs, spiritual teachers, etc.`;

  let supportiveText: string | null = null;
  let geminiDebug: any = null;

  try {
    const gRes = await callGeminiGenerate(userPrompt);
    geminiDebug = gRes.raw;
    supportiveText = gRes.text ?? null;
    if (!supportiveText) {
      console.warn("Gemini returned no text, geminiDebug:", geminiDebug);
    } else {
      console.log("Gemini supportiveText:", supportiveText);
    }
  } catch (e: any) {
    console.error("Gemini call failed:", e?.message ?? e);
  }

  // sentiment — now using Google Cloud Natural Language API
  let scoreRes = { score: 3, confidence: 0.5, raw: null as any };
  try {
    scoreRes = await getGoogleNLPSentiment(moodText);
  } catch (e: any) {
    console.error("Google NLP failed:", e?.message ?? e);
    scoreRes = { score: 3, confidence: 0.5, raw: { error: String(e) } };
  }

  const moodScore = Math.max(1, Math.min(5, Math.round(Number(scoreRes.score))));
  const credits = scoreToCredits(moodScore);

  if (!supportiveText) supportiveText = "Thanks for sharing. Be kind to yourself.";

  try {
    await db.insert(mood).values({
      id: randomUUID(),
      userId,
      moodText,
      supportiveText,
      moodScore,
      scoreConfidence: (scoreRes.confidence ?? 0).toFixed(2),
      credits,
      createdAt: new Date(),
    } as any);
  } catch (dbErr) {
    console.error("DB insert failed:", dbErr);
    return NextResponse.json({ error: "Failed to save mood", details: String(dbErr) }, { status: 500 });
  }

  return NextResponse.json({
    message: "Mood saved successfully!",
    supportiveText,
    moodScore,
    credits,
    modelDebug: geminiDebug,
    sentimentDebug: scoreRes.raw,
  });
}
