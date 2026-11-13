function removeDangerousImports(code = "") {
  let safe = String(code || "");
  safe = safe.replace(/^\s*import\s+['"]dart:html['"](?:\s+as\s+\w+)?\s*;\s*$/gm, "");
  safe = safe.replace(/^\s*import\s+['"]package:sqflite\/sqflite\.dart['"]\s*;\s*$/gm, "");
  safe = safe.replace(/^\s*import\s+['"]package:path\/path\.dart['"]\s*;\s*$/gm, "");
  safe = safe.replace(/^\s*import\s+['"]package:path\/src\/context\.dart['"]\s*;\s*$/gm, "");
  return safe;
}

// Packages that Groq may generate but are not available in the bare web preview project.
// We strip their imports and replace their usage with native Dart equivalents.
function fixUnsupportedWebPackages(code = "") {
  let safe = String(code || "");

  // --- uuid ---
  // Remove the import line
  safe = safe.replace(/^\s*import\s+['"]package:uuid\/uuid\.dart['"]\s*;\s*$/gm, "");
  // Remove field declarations like: final Uuid _uuid = const Uuid();  or  final _uuid = Uuid();
  safe = safe.replace(/^\s*(?:final|late final)\s+(?:Uuid\s+)?_uuid\s*=\s*(?:const\s+)?Uuid\(\)\s*;\s*$/gm, "");
  // Replace _uuid.v4() / _uuid.v1() with a unique string using timestamp + random
  safe = safe.replace(
    /\b_uuid\.v[0-9]+\(\)/g,
    "'\${DateTime.now().millisecondsSinceEpoch}_\${(DateTime.now().microsecond * 1000 + DateTime.now().millisecond).toString()}'"
  );
  // Replace standalone Uuid().v4() / const Uuid().v4()
  safe = safe.replace(
    /(?:const\s+)?Uuid\(\)\.v[0-9]+\(\)/g,
    "'\${DateTime.now().millisecondsSinceEpoch}'"
  );

  // --- supabase_flutter (AI hallucination guard) ---
  // The Supabase package is only present in Supabase-mode projects.
  // When the AI erroneously emits it in a plain CRUD app, strip the import
  // and stub out the two top-level usages so the code still compiles.
  if (
    safe.includes("package:supabase_flutter/supabase_flutter.dart") &&
    // Only strip if this is NOT intentional Supabase code (no supabase client calls)
    !safe.includes(".from(") && !safe.includes("Supabase.initialize")
  ) {
    safe = safe.replace(/^\s*import\s+['"]package:supabase_flutter\/supabase_flutter\.dart['"]\s*;\s*$/gm, "");
  }

  return safe;
}

function normalizeDirectivesAtTop(code = "") {
  let safe = String(code || "");
  const directiveRegex = /^\s*(import|export|part)\s+[^;]+;\s*$/gm;
  const directives = [];
  let match;

  while ((match = directiveRegex.exec(safe)) !== null) {
    const line = match[0].trim();
    if (line.includes("package:sqflite/sqflite.dart")) continue;
    if (line.includes("package:path/path.dart")) continue;
    if (line.includes("package:path/src/context.dart")) continue;
    if (line.includes("package:supabase_flutter/supabase_flutter.dart") &&
        !safe.includes(".from(") && !safe.includes("Supabase.initialize")) continue;
    directives.push(line);
  }

  safe = safe.replace(directiveRegex, "").trim();

  if (!directives.some((line) => line.includes("package:flutter/material.dart"))) {
    directives.unshift("import 'package:flutter/material.dart';");
  }
  if (safe.includes("math.") && !directives.some((line) => line.includes("dart:math"))) {
    directives.push("import 'dart:math' as math;");
  }

  const seen = new Set();
  const unique = [];
  for (const directive of directives) {
    if (seen.has(directive)) continue;
    seen.add(directive);
    unique.push(directive);
  }

  unique.sort((a, b) => {
    if (a.includes("dart:")) return -1;
    if (b.includes("dart:")) return 1;
    if (a.includes("package:flutter/material.dart")) return -1;
    if (b.includes("package:flutter/material.dart")) return 1;
    return a.localeCompare(b);
  });

  return `${unique.join("\n")}\n\n${safe}`;
}

function fixContextConflicts(code = "") {
  let safe = String(code || "");
  safe = safe.replace(/\bContext\s+context\b/g, "BuildContext context");
  safe = safe.replace(/\bContext\s+ctx\b/g, "BuildContext ctx");
  safe = safe.replace(/\bContext\s+dialogContext\b/g, "BuildContext dialogContext");
  safe = safe.replace(/\bContext\s+modalContext\b/g, "BuildContext modalContext");
  safe = safe.replace(/Widget\s+build\s*\(\s*Context\s+context\s*\)/g, "Widget build(BuildContext context)");
  safe = safe.replace(/builder:\s*\(\s*Context\s+context\s*\)/g, "builder: (BuildContext context)");
  safe = safe.replace(/builder:\s*\(\s*Context\s+context\s*,/g, "builder: (BuildContext context,");
  safe = safe.replace(/itemBuilder:\s*\(\s*Context\s+context\s*,/g, "itemBuilder: (BuildContext context,");
  return safe;
}

function fixUiVariant(code = "") {
  let safe = String(code || "");
  safe = safe.replace(/static\s+const\s+int\s+uiVariant\s*=\s*NaN\s*;/g, "static const int uiVariant = 0;");
  safe = safe.replace(/static\s+const\s+int\s+uiVariant\s*=\s*undefined\s*;/g, "static const int uiVariant = 0;");
  safe = safe.replace(/static\s+const\s+int\s+uiVariant\s*=\s*null\s*;/g, "static const int uiVariant = 0;");
  safe = safe.replace(/static\s+const\s+int\s+uiVariant\s*=\s*['"][^'"]+['"]\s*;/g, "static const int uiVariant = 0;");
  return safe;
}

function fixDartStringConstructor(code = "") {
  let safe = String(code || "");

  const replacements = [
    [/String\s*\(\s*existing\?\[field\.name\]\s*\?\?\s*''\s*\)/g, "(existing?[field.name] ?? '').toString()"],
    [/String\s*\(\s*record\[field\.name\]\s*\?\?\s*''\s*\)/g, "(record[field.name] ?? '').toString()"],
    [/String\s*\(\s*record\.values\.join\(' '\)\s*\)/g, "record.values.join(' ').toString()"],
    [/String\s*\(\s*record\.values\.join\(" "\)\s*\)/g, 'record.values.join(" ").toString()'],
    [/String\s*\(\s*value\s*\)/g, "value.toString()"],
    [/String\s*\(\s*item\s*\)/g, "item.toString()"],
    [/String\s*\(\s*option\s*\)/g, "option.toString()"],
    [/String\s*\(\s*row\s*\)/g, "row.toString()"],
  ];

  for (const [pattern, replacement] of replacements) {
    safe = safe.replace(new RegExp(`(?<![\\w$.])${pattern.source}`, pattern.flags), replacement);
  }

  safe = safe.replace(/(?<![\w$.])String\s*\(\s*([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\]|\.[A-Za-z_][A-Za-z0-9_]*)*)\s*\)/g, "$1.toString()");
  // Recover the exact legacy corruption in compiler-generated persisted apps.
  if (safe.includes('class NormalizedMemoryStore') && safe.includes('package:shared_preferences/shared_preferences.dart')) {
    safe = safe.replace(/\bpreferences\.get_storageKey\.toString\(\)/g, 'preferences.getString(_storageKey)');
  }
  return safe;
}

function fixMapTypeMismatches(code = "") {
  let safe = String(code || "");
  safe = safe.replace(/Map<String,\s*String>/g, "Map<String, dynamic>");
  safe = safe.replace(/List<Map<String,\s*String>>/g, "List<Map<String, dynamic>>");
  safe = safe.replace(/Map<String,String>/g, "Map<String, dynamic>");
  safe = safe.replace(/List<Map<String,String>>/g, "List<Map<String, dynamic>>");
  return safe;
}

function stripClassByName(code = "", className = "") {
  const safe = String(code || "");
  const start = safe.indexOf(`class ${className}`);
  if (start === -1) return safe;
  const braceStart = safe.indexOf("{", start);
  if (braceStart === -1) return safe;

  let depth = 0;
  let end = -1;
  for (let i = braceStart; i < safe.length; i += 1) {
    if (safe[i] === "{") depth += 1;
    if (safe[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end === -1) return safe;
  return `${safe.slice(0, start)}${safe.slice(end)}`;
}

function memoryAppDatabaseClass() {
  return `
class AppDatabase {
  AppDatabase._internal();
  static final AppDatabase instance = AppDatabase._internal();
  final List<Map<String, dynamic>> _records = <Map<String, dynamic>>[];
  int _nextId = 1;

  Map<String, dynamic> _normalizeRecord(Map<String, dynamic> record) {
    final normalized = Map<String, dynamic>.from(record);
    normalized['id'] ??= _nextId++;
    if (normalized['id'] is int && normalized['id'] >= _nextId) {
      _nextId = (normalized['id'] as int) + 1;
    }
    return normalized;
  }

  Future<List<Map<String, dynamic>>> getAll() async => List<Map<String, dynamic>>.from(_records.map((item) => Map<String, dynamic>.from(item)));
  Future<List<Map<String, dynamic>>> getAllRecords() async => getAll();
  Future<List<Map<String, dynamic>>> getRecords() async => getAll();
  Future<List<Map<String, dynamic>>> readAll() async => getAll();
  Future<List<Map<String, dynamic>>> fetchAll() async => getAll();
  Future<List<Map<String, dynamic>>> all() async => getAll();
  Future<List<Map<String, dynamic>>> queryAll() async => getAll();
  Future<List<Map<String, dynamic>>> queryRecords() async => getAll();

  Future<List<Map<String, dynamic>>> search(String query) async {
    final cleanQuery = query.toLowerCase().trim();
    if (cleanQuery.isEmpty) return getAll();
    return _records.where((record) => record.values.any((value) => value.toString().toLowerCase().contains(cleanQuery))).map((item) => Map<String, dynamic>.from(item)).toList();
  }

  Future<Map<String, dynamic>?> getById(int id) async {
    try {
      final record = _records.firstWhere((item) => item['id'] == id);
      return Map<String, dynamic>.from(record);
    } catch (_) {
      return null;
    }
  }

  Future<int> insert(Map<String, dynamic> record) async { final normalized = _normalizeRecord(record); _records.add(normalized); return normalized['id'] as int; }
  Future<int> insertRecord(Map<String, dynamic> record) async => insert(record);
  Future<int> add(Map<String, dynamic> record) async => insert(record);
  Future<int> addRecord(Map<String, dynamic> record) async => insert(record);
  Future<int> create(Map<String, dynamic> record) async => insert(record);
  Future<int> createRecord(Map<String, dynamic> record) async => insert(record);

  Future<int> save(Map<String, dynamic> record) async {
    final dynamic id = record['id'];
    if (id is int && _records.any((item) => item['id'] == id)) return update(id, record);
    return insert(record);
  }

  Future<int> update(int id, Map<String, dynamic> record) async {
    final index = _records.indexWhere((item) => item['id'] == id);
    if (index == -1) return 0;
    final updated = Map<String, dynamic>.from(record);
    updated['id'] = id;
    _records[index] = updated;
    return 1;
  }
  Future<int> updateRecord(int id, Map<String, dynamic> record) async => update(id, record);
  Future<int> edit(int id, Map<String, dynamic> record) async => update(id, record);
  Future<int> editRecord(int id, Map<String, dynamic> record) async => update(id, record);

  Future<int> delete(int id) async { final before = _records.length; _records.removeWhere((item) => item['id'] == id); return before == _records.length ? 0 : 1; }
  Future<int> deleteRecord(int id) async => delete(id);
  Future<int> remove(int id) async => delete(id);
  Future<int> removeRecord(int id) async => delete(id);
  Future<void> clear() async { _records.clear(); }
}
`;
}

function stripSqfliteDatabaseClass(code = "") {
  let safe = String(code || "");
  if (!safe.includes("class AppDatabase")) return safe;
  safe = stripClassByName(safe, "AppDatabase");
  return `${memoryAppDatabaseClass()}\n\n${safe}`;
}

function patchCommonDatabaseCalls(code = "") {
  let safe = String(code || "");
  safe = safe.replace(/\bDatabase\?/g, "dynamic");
  safe = safe.replace(/\bFuture<Database>/g, "Future<dynamic>");
  safe = safe.replace(/\bDatabase\b/g, "dynamic");
  safe = safe.replace(/\bgetDatabasesPath\s*\(\s*\)/g, "Future.value('')");
  safe = safe.replace(/\bjoin\s*\(/g, "'' + ");
  safe = safe.replace(/\bopenDatabase\s*\([\s\S]*?\);\s*/g, "Future.value(null);");
  return safe;
}

function ensureAppDatabaseIfReferenced(code = "") {
  let safe = String(code || "");
  if (safe.includes("AppDatabase.instance") && !safe.includes("class AppDatabase")) {
    safe = `${memoryAppDatabaseClass()}\n\n${safe}`;
  }
  return safe;
}

// Fix: showDatePicker returns DateTime? — guard against null before calling methods on it.
// Pattern 1: selectedDate.toLocal().toString().split(' ')[0]  →  formatted yyyy-MM-dd
// Pattern 2: any .toLocal() call on a nullable DateTime variable
function fixNullableDatePicker(code = "") {
  let safe = String(code || "");

  // Replace the common generated pattern:
  // 'Date: ${selectedDate.toLocal().toString().split(' ')[0]}')
  safe = safe.replace(
    /'\$\{(\w+)\.toLocal\(\)\.toString\(\)\.split\(' '\)\[0\]\}'/g,
    (_, varName) =>
      `'\${${varName} != null ? ${varName}!.toLocal().toString().split(\\' \\')[0] : \\'\\'}'`
  );

  // Replace bare: selectedDate.toLocal()  →  selectedDate!.toLocal()
  // only when the variable is already guarded by an if-null-return above it,
  // so a non-null assertion is safe. We look for the pattern right after
  // "if (selectedDate == null) return;" which the factory always emits.
  safe = safe.replace(
    /(if\s*\(\s*(\w+)\s*==\s*null\s*\)\s*return\s*;[\s\S]*?)(\2)\.toLocal\(\)/g,
    (match, before, varName, ref) => `${before}${varName}!.toLocal()`
  );

  // Broader fallback: any remaining .toLocal() on a DateTime? — add non-null assertion
  // This is safe because the factory always emits a null-return guard before use.
  safe = safe.replace(/\b(selectedDate|pickedDate|chosenDate|date)\b\.toLocal\(\)/g, "$1!.toLocal()");

  return safe;
}

function fixBrokenStorageKey(code = "") {
  // Fixes code-generation bug where JS template literal produced:
  // 'vibeapp_records_${safesafe.appName.toString()}'  (broken Dart)
  // Replace with a plain string literal that has no runtime interpolation.
  return String(code || "").replace(
    /('vibeapp_records_)\$\{safesafe\.appName\.toString\(\)\}'/g,
    "'vibeapp_records_app'"
  );
}

function findMatchingParen(str, openIndex) {
  let depth = 0;
  let inString = false;
  let stringChar = "";

  for (let i = openIndex; i < str.length; i++) {
    const char = str[i];
    const prev = str[i - 1];

    if ((char === '"' || char === "'") && prev !== "\\") {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
      continue;
    }

    if (inString) continue;

    if (char === "(") depth++;
    if (char === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function fixRenderFlexOverflows(code = "") {
  let safe = String(code || "");

  // 1. Ensure Scaffold has resizeToAvoidBottomInset: true so soft keyboard doesn't cause overflow
  if (safe.includes("Scaffold(")) {
    safe = safe.replace(/\bScaffold\s*\(\s*(?![\s\S]{0,80}resizeToAvoidBottomInset)/g, "Scaffold(\n      resizeToAvoidBottomInset: true,\n      ");
    safe = safe.replace(/resizeToAvoidBottomInset:\s*true,\s*resizeToAvoidBottomInset:\s*(?:true|false),?/g, "resizeToAvoidBottomInset: true,");
  }

  // 2. Add FlutterError.onError handler in main() to suppress disruptive yellow-black overflow bars in preview
  if (safe.includes("void main()") && !safe.includes("RenderFlex overflowed")) {
    safe = safe.replace(
      /void\s+main\s*\(\s*\)\s*\{/g,
      `void main() {\n  WidgetsFlutterBinding.ensureInitialized();\n  FlutterError.onError = (FlutterErrorDetails details) {\n    if (details.exceptionAsString().contains('RenderFlex overflowed') || details.exceptionAsString().contains('overflowed by')) {\n      debugPrint('Layout overflow auto-handled: \${details.exceptionAsString()}');\n      return;\n    }\n    FlutterError.presentError(details);\n  };`
    );
  }

  // 3. Fix unscrollable Columns in body and dialog content:
  // Find all instances where Column( is assigned to body, child of Center/SafeArea/Padding in body, or content: of dialog
  const targetPatterns = [
    /\bbody\s*:\s*Column\s*\(/g,
    /\bbody\s*:\s*Center\s*\(\s*child\s*:\s*Column\s*\(/g,
    /\bbody\s*:\s*SafeArea\s*\(\s*child\s*:\s*Column\s*\(/g,
    /\bbody\s*:\s*Padding\s*\([\s\S]*?child\s*:\s*Column\s*\(/g,
    /\bbody\s*:\s*SafeArea\s*\(\s*child\s*:\s*Padding\s*\([\s\S]*?child\s*:\s*Column\s*\(/g,
    /\bcontent\s*:\s*Column\s*\(/g,
    /\bcontent\s*:\s*Padding\s*\([\s\S]*?child\s*:\s*Column\s*\(/g,
  ];

  const matches = [];

  for (const pattern of targetPatterns) {
    let pMatch;
    while ((pMatch = pattern.exec(safe)) !== null) {
      const matchStr = pMatch[0];
      const colIdx = pMatch.index + matchStr.lastIndexOf("Column(");
      const openParen = colIdx + "Column".length;
      const closeParen = findMatchingParen(safe, openParen);

      if (closeParen !== -1) {
        const preceding = safe.slice(Math.max(0, colIdx - 80), colIdx);
        if (!preceding.includes("SingleChildScrollView") && !preceding.includes("ListView")) {
          const colBlock = safe.slice(colIdx, closeParen + 1);
          // If Column does not contain Expanded/Spacer (which require fixed height parents), wrap it with SingleChildScrollView
          if (!colBlock.includes("Expanded(") && !colBlock.includes("Spacer(")) {
            matches.push({
              start: colIdx,
              end: closeParen + 1,
              replacement: `SingleChildScrollView(child: ${colBlock})`,
            });
          }
        }
      }
    }
  }

  // Deduplicate and sort descending by start index
  const uniqueMatches = [];
  const seenStarts = new Set();
  for (const m of matches) {
    if (!seenStarts.has(m.start)) {
      seenStarts.add(m.start);
      uniqueMatches.push(m);
    }
  }
  uniqueMatches.sort((a, b) => b.start - a.start);

  for (const item of uniqueMatches) {
    safe = safe.slice(0, item.start) + item.replacement + safe.slice(item.end);
  }

  return safe;
}

/**
 * Strips comments and string literals so bracket counting is accurate.
 */
function stripCommentsAndStrings(code = "") {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBlockComment = false;
  let inLineComment = false;
  let output = "";

  const len = code.length;
  for (let i = 0; i < len; i++) {
    const ch = code[i];
    const next = i + 1 < len ? code[i + 1] : "";

    if (inLineComment) {
      if (ch === "\n") {
        inLineComment = false;
        output += "\n";
      }
      continue;
    }

    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i++; // skip /
      }
      continue;
    }

    if (inSingleQuote) {
      if (ch === "\\") {
        i++; // skip escaped char
      } else if (ch === "'") {
        inSingleQuote = false;
      }
      continue;
    }

    if (inDoubleQuote) {
      if (ch === "\\") {
        i++; // skip escaped char
      } else if (ch === '"') {
        inDoubleQuote = false;
      }
      continue;
    }

    if (ch === "/" && next === "/") {
      inLineComment = true;
      i++;
      continue;
    }

    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i++;
      continue;
    }

    if (ch === "'") {
      inSingleQuote = true;
      continue;
    }

    if (ch === '"') {
      inDoubleQuote = true;
      continue;
    }

    output += ch;
  }

  return { stripped: output, unclosedString: inSingleQuote || inDoubleQuote };
}

/**
 * Validates Flutter code syntax, bracket balance, and required entrypoints.
 * Returns { valid: boolean, errors: string[] }
 */
function checkFlutterCodeSyntax(code = "") {
  const text = String(code || "").trim();
  const errors = [];

  if (!text) {
    return { valid: false, errors: ["Empty code returned."] };
  }

  if (text.length < 300) {
    errors.push("Code is too short to be a functional Flutter application.");
  }

  if (!text.includes("void main") && !text.includes("Future<void> main")) {
    errors.push("Missing main() entrypoint function.");
  }

  if (!text.includes("runApp(")) {
    errors.push("Missing runApp() call.");
  }

  if (!text.includes("MaterialApp") && !text.includes("WidgetsApp") && !text.includes("CupertinoApp")) {
    errors.push("Missing MaterialApp widget.");
  }

  if (/```[a-z]*\b/i.test(text)) {
    errors.push("Code contains leftover markdown code fences.");
  }

  const { stripped, unclosedString } = stripCommentsAndStrings(text);

  if (unclosedString) {
    errors.push("Unterminated string literal detected.");
  }

  let braceCount = 0;
  let parenCount = 0;
  let bracketCount = 0;

  for (let i = 0; i < stripped.length; i++) {
    const ch = stripped[i];
    if (ch === "{") braceCount++;
    else if (ch === "}") braceCount--;
    else if (ch === "(") parenCount++;
    else if (ch === ")") parenCount--;
    else if (ch === "[") bracketCount++;
    else if (ch === "]") bracketCount--;

    if (braceCount < 0) {
      errors.push("Extra closing curly brace '}' found before opening brace.");
      break;
    }
    if (parenCount < 0) {
      errors.push("Extra closing parenthesis ')' found before opening parenthesis.");
      break;
    }
    if (bracketCount < 0) {
      errors.push("Extra closing square bracket ']' found before opening bracket.");
      break;
    }
  }

  if (braceCount > 0) {
    errors.push(`Missing ${braceCount} closing curly brace(s) '}'.`);
  }
  if (parenCount > 0) {
    errors.push(`Missing ${parenCount} closing parenthesis ')'.`);
  }
  if (bracketCount > 0) {
    errors.push(`Missing ${bracketCount} closing square bracket(s) ']'.`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Auto-repairs simple non-fatal bracket or invalid const issues in Flutter code.
 */
function fixCommonDartSyntaxErrors(code = "") {
  let safe = String(code || "");

  // 1. Fix invalid const on String interpolations: const Text('${...}') or const Text("$...")
  safe = safe.replace(/\bconst\s+(Text|TextStyle|TextSpan|InputDecoration|BoxDecoration)\s*\(\s*(['"][^'"]*\$[^'"]*['"])/g, "$1($2");

  // 2. Fix invalid const Color with dynamic alpha or opacity
  safe = safe.replace(/\bconst\s+Color\(\s*0x[0-9a-fA-F]+\s*\)\.withOpacity\(/g, "Color(");

  // 3. Remove leftover markdown fences if present
  safe = safe.replace(/^```[a-z]*\s*/gim, "").replace(/```\s*$/gim, "");

  // 4. Auto-append missing closing braces if within small threshold (<= 3) at end of file
  const { stripped } = stripCommentsAndStrings(safe);
  let openBraces = 0;
  for (let i = 0; i < stripped.length; i++) {
    if (stripped[i] === "{") openBraces++;
    else if (stripped[i] === "}") openBraces--;
  }

  if (openBraces > 0 && openBraces <= 4) {
    const trimmed = safe.trim();
    if (trimmed.endsWith(";") || trimmed.endsWith("}") || trimmed.endsWith(")")) {
      safe = trimmed + "\n" + "}".repeat(openBraces) + "\n";
    }
  }

  return safe;
}



function replaceClassByName(code = "", className = "", replacement = "") {
  const safe = String(code || "");
  const start = safe.indexOf(`class ${className}`);
  if (start === -1) return safe;
  const braceStart = safe.indexOf("{", start);
  if (braceStart === -1) return safe;

  let depth = 0;
  let end = -1;
  for (let i = braceStart; i < safe.length; i += 1) {
    if (safe[i] === "{") depth += 1;
    if (safe[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end === -1) return safe;
  return `${safe.slice(0, start)}${String(replacement || "")}${safe.slice(end)}`;
}

function safeContextAuthGateStateClass() {
  return `class _ContextAuthGateState extends State<ContextAuthGate> {
  String? selectedRole;
  bool splash = true;

  @override
  void initState() {
    super.initState();
    Future<void>.delayed(const Duration(milliseconds: 450), () {
      if (mounted) setState(() => splash = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    if (splash) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              CircleAvatar(
                radius: 34,
                backgroundColor: AppDesign.primary.withOpacity(.12),
                child: Icon(Icons.auto_awesome, color: AppDesign.primary, size: 34),
              ),
              const SizedBox(height: 16),
              Text(
                AppDesign.name,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (generatedRoles.isEmpty) {
      return const ContextHomePage();
    }

    if (selectedRole != null) {
      return ContextHomePage(
        initialRole: selectedRole,
        onLogout: () => setState(() => selectedRole = null),
      );
    }

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: ListView(
              shrinkWrap: true,
              padding: const EdgeInsets.all(24),
              children: <Widget>[
                Text(
                  'Welcome to ' + AppDesign.name,
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Choose a role to enter the demo workspace. Production authentication can be connected to your identity provider.',
                ),
                const SizedBox(height: 22),
                ...generatedRoles.map<Widget>((role) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: FilledButton.tonalIcon(
                      onPressed: () {
                        setState(() {
                          selectedRole = role;
                        });
                      },
                      icon: const Icon(Icons.person_outline),
                      label: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        child: Text('Continue as ' + role),
                      ),
                    ),
                  );
                }),
              ],
            ),
          ),
        ),
      ),
    );
  }
}`;
}

function fixLegacyContextAuthGate(code = "") {
  let safe = String(code || "");
  const hasLegacyRoleGate =
    safe.includes("class ContextAuthGate") &&
    safe.includes("class _ContextAuthGateState") &&
    safe.includes("generatedRoles.map((r)=>Padding");

  if (!hasLegacyRoleGate) return safe;

  const hasEmptyGeneratedRoles = /const\s+List<String>\s+generatedRoles\s*=\s*<String>\s*\[\s*\]\s*;/.test(safe);
  if (hasEmptyGeneratedRoles) {
    safe = safe.replace(/home\s*:\s*const\s+ContextAuthGate\s*\(\s*\)/g, "home: const ContextHomePage()");
    safe = safe.replace(/home\s*:\s*ContextAuthGate\s*\(\s*\)/g, "home: const ContextHomePage()");
    safe = stripClassByName(safe, "ContextAuthGate");
    safe = stripClassByName(safe, "_ContextAuthGateState");
    return safe;
  }

  return replaceClassByName(safe, "_ContextAuthGateState", safeContextAuthGateStateClass());
}

function fixKnownFlutterCompatibility(code = "") {
  let safe = String(code || "");
  // A bare '$' is not a valid Dart string literal because $ starts interpolation.
  // A raw string is stable even when this code passes through JS template literals.
  safe = safe.replace(/(?<!r)'\$'/g, () => "r'$'");
  // Compatibility baseline: withOpacity is supported across the Flutter versions
  // used by the local preview/APK workers, while withValues is not universal.
  safe = safe.replace(/\.withValues\(\s*alpha\s*:\s*([^\)]+)\)/g, '.withOpacity($1)');
  // Older stable SDKs use `value` for DropdownButtonFormField selection.
  safe = safe.replace(/(DropdownButtonFormField(?:<[^>]+>)?\(\s*)initialValue\s*:/g, '$1value:');
  // SimpleBars.maxValue is double by contract in deterministic templates.
  safe = safe.replace(/(SimpleBars\([^;]*?maxValue\s*:\s*)(\d+)(\s*[,)])/gs, '$1$2.0$3');
  return safe;
}

function sanitizeGeneratedFlutterCode(code = "") {
  let safe = String(code || "");
  safe = fixCommonDartSyntaxErrors(safe);
  safe = fixLegacyContextAuthGate(safe);
  safe = fixKnownFlutterCompatibility(safe);
  safe = fixBrokenStorageKey(safe);
  safe = removeDangerousImports(safe);
  safe = fixUnsupportedWebPackages(safe);
  safe = fixContextConflicts(safe);
  safe = fixUiVariant(safe);
  safe = fixDartStringConstructor(safe);
  safe = fixMapTypeMismatches(safe);
  safe = fixNullableDatePicker(safe);

  if (safe.includes("sqflite") || safe.includes("Database") || safe.includes("AppDatabase") || safe.includes("openDatabase") || safe.includes("getDatabasesPath")) {
    safe = stripSqfliteDatabaseClass(safe);
    safe = patchCommonDatabaseCalls(safe);
    safe = ensureAppDatabaseIfReferenced(safe);
  }

  safe = fixDartStringConstructor(safe);
  safe = fixMapTypeMismatches(safe);
  safe = fixRenderFlexOverflows(safe);
  safe = normalizeDirectivesAtTop(safe);
  safe = fixCommonDartSyntaxErrors(safe);
  safe = safe.replace(/\n{3,}/g, "\n\n");
  return `${safe.trim()}\n`;
}

module.exports = {
  sanitizeGeneratedFlutterCode,
  checkFlutterCodeSyntax,
  fixCommonDartSyntaxErrors,
  fixKnownFlutterCompatibility,
  fixLegacyContextAuthGate,
};
