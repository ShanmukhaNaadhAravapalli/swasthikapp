// app/api/ai/remix/route.ts
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";  // <-- different SDK for API key

export const runtime = "nodejs";

type ReqBody = { text?: string };

const PROMPT_TEMPLATE = `Enhance the following text to correct grammar, spelling, and fluency,
while keeping the original meaning intact. 
Do not add or remove ideas — just improve clarity.
convert it into modern english
Text: """{INPUT}"""`;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ReqBody;
    const text = (body.text || "").trim();
    if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // or "gemini-1.5-pro"
    const prompt = PROMPT_TEMPLATE.replace("{INPUT}", text);

    const result = await model.generateContent(prompt);
    const enhanced = result.response.text();

    return NextResponse.json({ enhancedText: enhanced });
  } catch (err: any) {
    console.error("Remix error:", err);
    return NextResponse.json({ error: err?.message || "failed" }, { status: 500 });
  }
}
