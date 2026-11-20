import { apiRequest } from "./client";

export const generateApplication = (prompt) => apiRequest("/generation/hybrid-generate", { method: "POST", body: JSON.stringify({ prompt }) });
export const generateSupabaseApplication = (prompt, supabaseUrl, supabaseAnonKey) =>
  apiRequest("/generation/supabase-generate", {
    method: "POST",
    body: JSON.stringify({ prompt, supabaseUrl, supabaseAnonKey }),
  });
export function extractCode(data) { return data?.code || data?.generatedCode || data?.updatedCode || ""; }

/** Send a builder-generated instruction string to the code-edit endpoint */
export const applyBuilderEdit = (instruction, currentCode, originalPrompt = "", supabaseConfig = null) =>
  apiRequest("/code-edit", {
    method: "POST",
    body: JSON.stringify({
      instruction,
      existingCode: currentCode,
      originalPrompt,
      ...(supabaseConfig || {}),
    }),
  });

