import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// A curated academic taxonomy used for deterministic tagging. The function tries
// keyword matching first (fast, free, deterministic) and only falls back to a
// heuristic n-gram extraction if no taxonomy terms match. This keeps the feature
// fully functional without any external API keys while still being "smart".
const TAG_TAXONOMY: { tag: string; keywords: string[] }[] = [
  { tag: "calculus", keywords: ["calculus", "derivative", "integral", "differentiation", "limit"] },
  { tag: "algebra", keywords: ["algebra", "matrix", "vector", "eigenvalue", "linear equation"] },
  { tag: "probability", keywords: ["probability", "random variable", "distribution", "bayes"] },
  { tag: "statistics", keywords: ["statistics", "regression", "hypothesis", "mean", "variance"] },
  { tag: "programming", keywords: ["programming", "code", "algorithm", "function", "variable", "loop"] },
  { tag: "data-structures", keywords: ["data structure", "array", "linked list", "tree", "graph", "stack", "queue"] },
  { tag: "databases", keywords: ["database", "sql", "query", "normalization", "schema", "join"] },
  { tag: "operating-systems", keywords: ["operating system", "process", "scheduling", "memory", "kernel"] },
  { tag: "mechanics", keywords: ["mechanics", "force", "newton", "kinematics", "momentum"] },
  { tag: "electromagnetism", keywords: ["electric", "magnetic", "maxwell", "field", "circuit"] },
  { tag: "quantum", keywords: ["quantum", "wavefunction", "schrodinger", "uncertainty"] },
  { tag: "thermodynamics", keywords: ["thermodynamic", "entropy", "heat", "temperature", "carnot"] },
  { tag: "organic-chemistry", keywords: ["organic", "alkane", "alkene", "reaction", "isomer"] },
  { tag: "inorganic-chemistry", keywords: ["inorganic", "metal", "complex", "ligand"] },
  { tag: "cell-biology", keywords: ["cell", "membrane", "organelle", "mitosis", "mitochondria"] },
  { tag: "genetics", keywords: ["genetic", "dna", "rna", "gene", "mutation", "heredity"] },
  { tag: "microbiology", keywords: ["microbiology", "bacteria", "virus", "fungi", "microorganism"] },
  { tag: "ecology", keywords: ["ecology", "ecosystem", "population", "biodiversity"] },
  { tag: "anatomy", keywords: ["anatomy", "organ", "skeleton", "muscle"] },
  { tag: "physiology", keywords: ["physiology", "homeostasis", "nervous system", "respiration"] },
  { tag: "pharmacology", keywords: ["pharmacology", "drug", "dose", "metabolism", "prescription"] },
  { tag: "pathology", keywords: ["pathology", "disease", "inflammation", "tumor"] },
  { tag: "microeconomics", keywords: ["microeconomics", "demand", "supply", "elasticity", "consumer"] },
  { tag: "macroeconomics", keywords: ["macroeconomics", "gdp", "inflation", "fiscal", "monetary"] },
  { tag: "econometrics", keywords: ["econometric", "ols", "regression model", "correlation"] },
  { tag: "constitutional-law", keywords: ["constitutional", "amendment", "judicial review", "constitution"] },
  { tag: "criminal-law", keywords: ["criminal", "offense", "liability", "actus reus", "mens rea"] },
  { tag: "contract-law", keywords: ["contract", "agreement", "consideration", "breach"] },
  { tag: "exam", keywords: ["past question", "exam", "past paper", "test", "midterm", "final"] },
  { tag: "lecture-notes", keywords: ["lecture note", "class note", "handout", "slide"] },
  { tag: "summary", keywords: ["summary", "revision", "cheat sheet", "overview"] },
  { tag: "solved-problems", keywords: ["solved", "solution", "worked example", "problem set"] },
  { tag: "lab-report", keywords: ["lab report", "experiment", "practical", "laboratory"] },
  { tag: "textbook", keywords: ["textbook", "chapter", "edition", "isbn"] },
  { tag: "formulas", keywords: ["formula", "equation sheet", "reference table"] },
];

interface TagRequest {
  title?: string;
  description?: string;
  type?: string;
  courseTitle?: string;
  departmentName?: string;
}

function inferTags(input: TagRequest): { tags: string[]; matchedKeywords: string[] } {
  const haystack = [
    input.title ?? "",
    input.description ?? "",
    input.type ?? "",
    input.courseTitle ?? "",
    input.departmentName ?? "",
  ].join(" ").toLowerCase();

  const tags: string[] = [];
  const matched: string[] = [];

  for (const entry of TAG_TAXONOMY) {
    for (const kw of entry.keywords) {
      if (haystack.includes(kw)) {
        if (!tags.includes(entry.tag)) tags.push(entry.tag);
        if (!matched.includes(kw)) matched.push(kw);
        break;
      }
    }
  }

  // Fallback: if nothing matched, derive a couple of simple n-gram tags from the
  // title so the material isn't untagged. Cap at 3 to stay useful.
  if (tags.length === 0 && input.title) {
    const words = input.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
    for (const w of words.slice(0, 3)) {
      if (!tags.includes(w)) tags.push(w);
    }
  }

  return { tags: tags.slice(0, 8), matchedKeywords: matched };
}

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "from", "into", "that", "this", "your",
  "introduction", "chapter", "lecture", "notes", "questions", "study",
  "guide", "what", "about", "their", "have", "will",
]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as TagRequest;

    // Optional: if the caller passes a materialId, we persist the tags back to the
    // materials row using the service-role client. This lets the upload flow call
    // once and have tags saved server-side. If no materialId is passed we just
    // return the suggested tags.
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const { tags, matchedKeywords } = inferTags(body);

    let saved = false;
    const materialId = (body as { materialId?: string }).materialId;
    if (materialId && supabaseUrl && serviceRoleKey) {
      const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
      });
      const { error } = await admin
        .from("materials")
        .update({ tags })
        .eq("id", materialId);
      saved = !error;
    }

    return new Response(
      JSON.stringify({
        tags,
        matchedKeywords,
        saved,
        source: "taxonomy",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message, tags: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
