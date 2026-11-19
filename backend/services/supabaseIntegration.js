"use strict";

const SUPABASE_FLUTTER_VERSION = "^2.5.0";

function clean(value) {
  return typeof value === "string" ? value.trim() : String(value || "").trim();
}

function resolveSupabaseConfig(supabaseConfig = null, appSpec = null, rawBody = null) {
  const candidates = [
    supabaseConfig,
    appSpec?.supabaseConfig,
    appSpec?.app?.supabase,
    appSpec?.supabase,
    rawBody?.supabaseConfig,
    rawBody,
  ].filter(Boolean);

  const first = (keys) => {
    for (const source of candidates) {
      for (const key of keys) {
        const value = source?.[key];
        if (value !== undefined && value !== null && clean(value)) return clean(value);
      }
    }
    return "";
  };

  const storageMode = first(["storageMode", "mode"]).toLowerCase() ||
    (first(["supabaseUrl", "supabase_url", "url"]) || first(["supabaseAnonKey", "supabase_anon_key", "anonKey", "anon_key"]) ? "supabase" : "local");

  return {
    storageMode,
    supabaseUrl: first(["supabaseUrl", "supabase_url", "url"]),
    supabaseAnonKey: first(["supabaseAnonKey", "supabase_anon_key", "anonKey", "anon_key", "publishableKey", "publishable_key"]),
    supabaseTable: first(["supabaseTable", "supabase_table", "tableName", "table"]),
    tableSql: first(["tableSql", "table_sql"]),
  };
}

function assertSupabaseConfig(config) {
  if (!config || config.storageMode !== "supabase") return;
  if (!config.supabaseUrl) {
    throw new Error("Supabase is enabled but Supabase URL was not provided.");
  }
  if (!config.supabaseAnonKey) {
    throw new Error("Supabase is enabled but Supabase anon/publishable key was not provided.");
  }
}

function dartString(value) {
  return clean(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function ensureSupabaseDependency(pubspec) {
  let text = String(pubspec || "");
  if (!text.trim()) return text;
  if (/^\s*supabase_flutter\s*:/m.test(text)) return text;

  const dependenciesMatch = text.match(/^dependencies:\s*$/m);
  if (dependenciesMatch) {
    const at = dependenciesMatch.index + dependenciesMatch[0].length;
    return `${text.slice(0, at)}\n  supabase_flutter: ${SUPABASE_FLUTTER_VERSION}${text.slice(at)}`;
  }

  return `${text.trimEnd()}\n\ndependencies:\n  supabase_flutter: ${SUPABASE_FLUTTER_VERSION}\n`;
}

function upsertSupabaseInitialization(mainCode, config) {
  let code = String(mainCode || "");
  const url = dartString(config.supabaseUrl);
  const key = dartString(config.supabaseAnonKey);
  const initBlock = `await Supabase.initialize(\n    url: '${url}',\n    anonKey: '${key}',\n  );`;

  if (!code.includes("package:supabase_flutter/supabase_flutter.dart")) {
    const imports = [...code.matchAll(/^import\s+['"][^'\"]+['"];\s*$/gm)];
    if (imports.length) {
      const last = imports[imports.length - 1];
      const insertAt = last.index + last[0].length;
      code = `${code.slice(0, insertAt)}\nimport 'package:supabase_flutter/supabase_flutter.dart';${code.slice(insertAt)}`;
    } else {
      code = `import 'package:supabase_flutter/supabase_flutter.dart';\n${code}`;
    }
  }

  const existingInit = /await\s+Supabase\.initialize\s*\(\s*url:\s*['"][^'\"]*['"]\s*,\s*anonKey:\s*['"][^'\"]*['"]\s*,?\s*\)/s;
  if (existingInit.test(code)) {
    return code.replace(existingInit, initBlock);
  }

  if (/Future<void>\s+main\s*\(\s*\)\s*async\s*\{/.test(code)) {
    return code.replace(
      /(Future<void>\s+main\s*\(\s*\)\s*async\s*\{)/,
      `$1\n  WidgetsFlutterBinding.ensureInitialized();\n  ${initBlock.replace(/\n/g, "\n  ")}`
    );
  }

  if (/void\s+main\s*\(\s*\)\s*\{/.test(code)) {
    code = code.replace(/void\s+main\s*\(\s*\)\s*\{/, "Future<void> main() async {\n  WidgetsFlutterBinding.ensureInitialized();");
    const marker = "  WidgetsFlutterBinding.ensureInitialized();";
    const at = code.indexOf(marker) + marker.length;
    code = `${code.slice(0, at)}\n  ${initBlock.replace(/\n/g, "\n  ")}${code.slice(at)}`;
    return code;
  }

  const mainLike = code.search(/runApp\s*\(/);
  if (mainLike >= 0) {
    const prefix = code.slice(0, mainLike);
    const suffix = code.slice(mainLike);
    return `Future<void> main() async {\n  WidgetsFlutterBinding.ensureInitialized();\n  ${initBlock.replace(/\n/g, "\n  ")}\n  ${suffix}\n}\n${prefix}`;
  }

  return code;
}

function applySupabaseIntegration(files, supabaseConfig) {
  const config = resolveSupabaseConfig(supabaseConfig);
  if (config.storageMode !== "supabase") return { files, config, changed: false };
  assertSupabaseConfig(config);

  const next = Array.isArray(files) ? files.map((file) => ({ ...file })) : [];
  const mainIndex = next.findIndex((f) => f?.path === "lib/main.dart");
  if (mainIndex < 0) throw new Error("Supabase is enabled but generated Flutter project has no lib/main.dart entrypoint.");

  next[mainIndex].content = upsertSupabaseInitialization(next[mainIndex].content, config);

  const pubspecIndex = next.findIndex((f) => f?.path === "pubspec.yaml");
  if (pubspecIndex >= 0) {
    next[pubspecIndex].content = ensureSupabaseDependency(next[pubspecIndex].content);
  } else {
    next.push({
      path: "pubspec.yaml",
      language: "yaml",
      role: "config",
      content: `name: generated_app\ndescription: Generated by VibeApp\npublish_to: 'none'\n\nenvironment:\n  sdk: '>=3.0.0 <4.0.0'\n\ndependencies:\n  flutter:\n    sdk: flutter\n  supabase_flutter: ${SUPABASE_FLUTTER_VERSION}\n\nflutter:\n  uses-material-design: true\n`,
    });
  }

  return { files: next, config, changed: true };
}

module.exports = {
  SUPABASE_FLUTTER_VERSION,
  resolveSupabaseConfig,
  assertSupabaseConfig,
  applySupabaseIntegration,
};
