import { NextResponse } from "next/server";
import OpenAI from "openai";

const getOpenAI = () => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
};

export async function POST(request: Request) {
  const body = (await request.json()) as {
    action: "summarize" | "draft" | "translate" | "transcribe";
    payload: string | string[];
  };

  const openai = getOpenAI();
  if (!openai) {
    return NextResponse.json(
      { error: "AI is not configured." },
      { status: 503 },
    );
  }

  const { action, payload } = body;

  try {
    if (action === "summarize") {
      const text = Array.isArray(payload) ? payload.join("\n") : payload;
      const { choices } = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Summarize the following chat messages concisely in 2-3 sentences.",
          },
          { role: "user", content: text },
        ],
        max_tokens: 150,
      });
      const summary = choices[0]?.message?.content ?? "";
      return NextResponse.json({ summary });
    }

    if (action === "draft") {
      const text = Array.isArray(payload) ? payload.join("\n") : payload;
      const { choices } = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Suggest 3 short reply options (one per line) to this message.",
          },
          { role: "user", content: text },
        ],
        max_tokens: 100,
      });
      const draft = choices[0]?.message?.content ?? "";
      const suggestions = draft.split("\n").filter(Boolean).slice(0, 3);
      return NextResponse.json({ suggestions });
    }

    if (action === "translate") {
      const text = Array.isArray(payload) ? payload[0] : payload;
      const targetLang = Array.isArray(payload) ? payload[1] : "en";
      const { choices } = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Translate the following message to ${targetLang}. Return only the translation.`,
          },
          { role: "user", content: text },
        ],
        max_tokens: 500,
      });
      const translation = choices[0]?.message?.content ?? "";
      return NextResponse.json({ translation });
    }

    if (action === "transcribe") {
      return NextResponse.json(
        { error: "Transcription requires audio file upload." },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch {
    return NextResponse.json(
      { error: "AI request failed." },
      { status: 500 },
    );
  }
}
