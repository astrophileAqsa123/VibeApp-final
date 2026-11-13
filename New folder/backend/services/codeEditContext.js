// Chooses which parts of a (possibly huge) Dart file to show the model for an
// edit instruction. Replaces the old "one blind 3200-char window" with the few
// functions that actually relate to the request, within a hard size budget so the
// request always fits the provider's token limit.

const { buildOutline, lineStarts, lineOf } = require("./codeOutline");

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "make", "change", "please", "can", "you", "app", "code", "flutter", "dart",
  "want", "like", "into", "from", "that", "this", "have", "been", "will", "some", "more", "also", "just",
  "then", "should", "would", "could", "need", "add", "set", "use", "all", "any", "show", "when", "where",
  "your", "our", "its", "are", "not", "but", "has", "was", "get", "new",
]);

/**
 * Instruction keyword -> real code patterns produced by VibeApp's own generators.
 * A block containing one of the patterns is strongly boosted when the instruction
 * contains one of the words.
 */
const WIDGET_HINTS = [
  { words: ["header", "title", "logo", "emoji", "banner", "domain", "top bar", "app title", "subtitle", "headline"], patterns: ["Widget _buildHeader(", "AppProfile.appName", "AppProfile.logo", "AppProfile.domain"] },
  { words: ["card", "cards", "item", "tile", "record", "row", "badge", "avatar", "pill", "border radius", "elevation", "shadow"], patterns: ["Widget _recordCard(", "Widget _tableRow(", "Widget _boardColumn("] },
  { words: ["form", "dialog", "modal", "input", "popup", "add record", "edit record", "datepicker", "calendar", "dropdown", "select"], patterns: ["Future<void> _openForm(", "showDatePicker(", "DropdownButtonFormField<String>(", "inputDecorationTheme:"] },
  { words: ["delete", "trash", "remove record", "confirm", "confirmation", "alert"], patterns: ["Future<void> _deleteRecord(", "AlertDialog("] },
  { words: ["search", "searchbar", "search bar", "magnifier", "clear search", "filter input"], patterns: ["Widget _buildSearchBar(", "_searchController", "hintText: 'Search"] },
  { words: ["stats", "total", "count", "metrics", "summary", "banner", "kpi"], patterns: ["Widget _buildStatsBanner(", "totalCount", "totalSum"] },
  { words: ["filter", "chips", "chip", "tabs", "category filter", "status filter"], patterns: ["Widget _buildFilterChips(", "ChoiceChip(", "_activeFilter"] },
  { words: ["empty", "no records", "empty state", "placeholder icon"], patterns: ["Widget _buildEmptyState("] },
  { words: ["button", "fab", "floating", "add button", "plus button", "action button"], patterns: ["FloatingActionButton.extended(", "FloatingActionButton(", "ElevatedButton.icon(", "FilledButton("] },
  { words: ["theme", "color", "colour", "background", "primary", "secondary", "surface", "accent", "dark mode", "light mode"], patterns: ["class AppProfile {", "ThemeData(", "ColorScheme.fromSeed("] },
  { words: ["layout", "grid", "table", "timeline", "kanban", "board", "list view", "stack"], patterns: ["Widget _buildBody(", "Widget _buildGrid(", "Widget _buildTable(", "Widget _buildTimeline(", "Widget _buildBoard(", "Widget _buildList("] },
  { words: ["scaffold", "safearea", "body", "snack", "snackbar"], patterns: ["ScaffoldMessenger.of(context).showSnackBar(", "Scaffold("] },
];

function splitWords(value = "") {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function singularWord(word) {
  if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
  if (/(ss|us|is)$/.test(word)) return word;
  if (word.endsWith("s") && word.length > 3) return word.slice(0, -1);
  return word;
}

function instructionKeywords(instruction = "") {
  const seen = new Set();
  for (const word of splitWords(instruction)) {
    if (word.length < 3 || STOP_WORDS.has(word)) continue;
    seen.add(singularWord(word));
  }
  return [...seen];
}

function countOccurrences(haystack, needle, cap) {
  let count = 0;
  let pos = 0;
  while (count < cap && (pos = haystack.indexOf(needle, pos)) !== -1) { count += 1; pos += needle.length; }
  return count;
}

/** Compiler diagnostics such as "lib/main.dart:120:15: Error ..." identify the exact code. */
function compilerLocation(code, instruction) {
  const match = String(instruction || "").match(/(?:lib[\\/]main\.dart|main\.dart):(\d+):(\d+)/i);
  if (!match) return -1;
  const starts = lineStarts(code);
  const line = Number(match[1]);
  if (line < 1 || line > starts.length) return -1;
  const lineEnd = line < starts.length ? starts[line] - 1 : code.length;
  return Math.min(lineEnd, starts[line - 1] + Math.max(0, Number(match[2]) - 1));
}

function windowAround(text, center, size) {
  const half = Math.floor(size / 2);
  const start = Math.max(0, Math.min(center - half, text.length - size));
  return { start, end: Math.min(text.length, start + size) };
}

/**
 * @param {string} code
 * @param {string} instruction
 * @param {{budgetChars?:number,maxBlockChars?:number,maxBlocks?:number,exclude?:Set<number>}} options
 * @returns {{blocks:Array, anchoredAt:string, confident:boolean}}
 *   blocks: [{label,name,parent,start,end,text,partial,score}] in file order
 */
function selectEditBlocks(code, instruction, options = {}) {
  const budget = Math.max(800, Number(options.budgetChars) || 6000);
  const maxBlockChars = Math.max(600, Math.min(Number(options.maxBlockChars) || 3600, budget));
  const maxBlocks = Math.max(1, Number(options.maxBlocks) || 4);
  const exclude = options.exclude instanceof Set ? options.exclude : new Set();
  const outline = buildOutline(code).filter((block) => !exclude.has(block.start));
  const lowerCode = String(code).toLowerCase();
  const keywords = instructionKeywords(instruction);
  const instr = String(instruction).toLowerCase();
  const activePatterns = WIDGET_HINTS.filter((hint) => hint.words.some((word) => instr.includes(word))).flatMap((hint) => hint.patterns);
  const compilerIndex = compilerLocation(code, instruction);

  // Words that occur in many blocks ("text", "screen", "build") say little; rare
  // words ("search", "login", "delete") pinpoint the right code. Weight by rarity.
  const blockTexts = outline.map((block) => lowerCode.slice(block.start, block.end));
  const blockNames = outline.map((block) => splitWords(`${block.parent} ${block.name}`).map(singularWord));
  const total = Math.max(1, outline.length);
  const rarity = new Map();
  for (const word of keywords) {
    let inNames = 0;
    let inText = 0;
    for (let i = 0; i < outline.length; i += 1) {
      if (blockNames[i].includes(word)) inNames += 1;
      if (blockTexts[i].includes(word)) inText += 1;
    }
    rarity.set(word, {
      name: Math.log(1 + total / (1 + inNames)),
      body: Math.log(1 + total / (1 + inText)),
    });
  }

  const scored = outline.map((block, index) => {
    const text = blockTexts[index];
    const nameTokens = blockNames[index];
    let score = 0;
    for (const word of keywords) {
      const weight = rarity.get(word);
      if (nameTokens.includes(word)) score += 4 * weight.name;
      else if (nameTokens.some((token) => token.length >= 4 && (token.includes(word) || word.includes(token)))) score += 1.5 * weight.name;
      score += (Math.min(4, countOccurrences(text, word, 4)) * weight.body) / (1 + block.length / 3000);
    }
    if (activePatterns.some((pattern) => code.slice(block.start, block.end).includes(pattern))) score += 6;
    if (/^_?build/i.test(block.name)) score += 0.25;
    if (block.length < 80) score *= 0.5; // one-liners (getters, tiny helpers) are rarely the edit target
    const compilerHit = compilerIndex >= 0 && compilerIndex >= block.start && compilerIndex < block.end;
    if (compilerHit) score += 1000;
    return { ...block, score, compilerHit };
  });

  let ranked = scored.filter((block) => block.score > 0).sort((a, b) => b.score - a.score);
  if (ranked.some((block) => block.compilerHit)) {
    ranked = ranked.filter((block) => block.compilerHit); // the compiler named the exact code
  } else if (ranked.length) {
    const floor = Math.max(0.5, ranked[0].score * 0.35);
    ranked = ranked.filter((block) => block.score >= floor); // drop weak coincidental matches
  }
  const confident = ranked.length > 0;
  if (!ranked.length) {
    // Nothing matched the wording: show the main screen builder rather than random code.
    const scaffold = scored.filter((block) => lowerCode.slice(block.start, block.end).includes("scaffold(")).sort((a, b) => b.length - a.length);
    ranked = (scaffold.length ? scaffold : scored.slice().sort((a, b) => b.length - a.length)).slice(0, 1);
  }

  const picked = [];
  let used = 0;
  for (const block of ranked) {
    if (picked.length >= maxBlocks) break;
    const size = Math.min(block.length, maxBlockChars);
    if (picked.length && used + size > budget) continue;
    picked.push(block);
    used += size;
  }

  const starts = lineStarts(code);
  const blocks = picked.map((block) => {
    let start = block.start;
    let end = block.end;
    let partial = false;
    if (block.length > maxBlockChars) {
      // Centre the window on the densest keyword hit (or the compiler line).
      let center = block.start + Math.floor(block.length / 2);
      if (block.compilerHit) center = compilerIndex;
      else {
        let best = -1;
        for (const word of keywords) {
          const at = lowerCode.indexOf(word, block.start);
          if (at !== -1 && at < block.end && (best === -1 || at < best)) best = at;
        }
        if (best !== -1) center = best;
      }
      const win = windowAround(code.slice(block.start, block.end), center - block.start, maxBlockChars);
      start = block.start + win.start;
      end = block.start + win.end;
      partial = true;
    }
    const first = lineOf(starts, start);
    const last = lineOf(starts, Math.max(start, end - 1));
    return {
      label: `${block.parent ? `${block.parent}.` : ""}${block.name || "(unnamed)"} (lines ${first}-${last}${partial ? ", partial" : ""})`,
      name: block.name,
      parent: block.parent,
      blockStart: block.start,
      blockEnd: block.end,
      start,
      end,
      text: code.slice(start, end),
      partial,
      score: block.score,
    };
  }).sort((a, b) => a.start - b.start);

  return { blocks, anchoredAt: blocks.length ? (blocks.slice().sort((a, b) => b.score - a.score)[0].label) : "none", confident };
}

module.exports = { selectEditBlocks, instructionKeywords, compilerLocation, WIDGET_HINTS, STOP_WORDS };
