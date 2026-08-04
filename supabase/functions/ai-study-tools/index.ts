import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TEXT_EXTENSIONS = ["txt", "md", "csv"];
const MAX_SOURCE_CHARS = 12000;

async function callGemini(geminiKey: string, prompt: string, jsonMode: boolean): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        ...(jsonMode ? { generationConfig: { responseMimeType: "application/json" } } : {}),
      }),
    }
  );
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini API error: ${errBody.slice(0, 300)}`);
  }
  const json = await res.json();
  return json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Not authenticated." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { materialId, mode } = await req.json();
    if (!materialId || (mode !== "summary" && mode !== "quiz")) {
      return new Response(JSON.stringify({ error: "materialId and a valid mode are required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const geminiKey = Deno.env.get("GEMINI_API_KEY") ?? "";

    const asCaller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userError } = await asCaller.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid session." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const { data: material, error: materialError } = await admin
      .from("materials")
      .select("id, title, description, type, tags, file_path, file_name, file_type, summary, quiz")
      .eq("id", materialId)
      .maybeSingle();
    if (materialError || !material) {
      return new Response(JSON.stringify({ error: "Material not found." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "summary" && material.summary) {
      return new Response(JSON.stringify({ summary: material.summary, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (mode === "quiz" && material.quiz) {
      return new Response(JSON.stringify({ quiz: material.quiz, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!geminiKey) {
      return new Response(
        JSON.stringify({ error: "AI features aren't configured yet (missing GEMINI_API_KEY)." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ext = (material.file_name.split(".").pop() || "").toLowerCase();
    let sourceText: string | null = null;
    if (TEXT_EXTENSIONS.includes(ext)) {
      const { data: fileBlob } = await admin.storage.from("materials").download(material.file_path);
      if (fileBlob) sourceText = (await fileBlob.text()).slice(0, MAX_SOURCE_CHARS);
    }
    const basedOnFullText = !!sourceText;

    const context = basedOnFullText
      ? `Document content:\n${sourceText}`
      : `We can't read the file directly (it's a ${material.file_type || ext} file), so use only this ` +
        `metadata:\nDescription: ${material.description || "(none provided)"}\n` +
        `Tags: ${(material.tags || []).join(", ") || "(none)"}`;

    if (mode === "summary") {
      const prompt =
        `You are helping a student quickly understand a study document titled "${material.title}". ` +
        `Write an easy-to-understand summary in plain language, as if explaining it to a classmate. ` +
        `Use short paragraphs or bullet points, under 200 words.` +
        (basedOnFullText ? "" : " Be upfront that this is based on the title/description, not the full file.") +
        `\n\n${context}`;

      const summary = (await callGemini(geminiKey, prompt, false)) || "Could not generate a summary for this document.";
      await admin.from("materials").update({ summary }).eq("id", materialId);
      return new Response(JSON.stringify({ summary, cached: false, basedOnFullText }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt =
      `Create 5 practice questions (with answers) to help a student review the study document titled ` +
      `"${material.title}", based on the content below. Mix short-answer and conceptual questions. ` +
      `Respond with ONLY a JSON array, no other text, in this exact shape: ` +
      `[{"question": "...", "answer": "..."}]` +
      (basedOnFullText ? "" : " (Base these on the title/description only, keep them general.)") +
      `\n\n${context}`;

    const raw = await callGemini(geminiKey, prompt, true);
    let quiz: { question: string; answer: string }[] = [];
    try {
      const cleaned = raw.replace(/^```json\s*|\s*```$/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        quiz = parsed
          .filter((q) => q && typeof q.question === "string" && typeof q.answer === "string")
          .slice(0, 8);
      }
    } catch {
      // fall through with empty quiz below
    }
    if (quiz.length === 0) {
      return new Response(JSON.stringify({ error: "Could not generate practice questions. Try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("materials").update({ quiz }).eq("id", materialId);
    return new Response(JSON.stringify({ quiz, cached: false, basedOnFullText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});