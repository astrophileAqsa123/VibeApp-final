// Structural outline of a Dart file: classes and their members with exact
// character ranges. AI edits use it to send the model only the few functions the
// instruction is about (instead of a blind fixed-size window), keeping requests
// small and the patch target precise on files of any size.
//
// The scanner is string/comment aware (including "${...}" interpolation), so
// braces inside text such as '{', "don't" or '${map['k']}' do not break ranges.

function isIdentChar(ch) {
  return ch !== undefined && /[A-Za-z0-9_$]/.test(ch);
}

/** Index just after the string literal that starts at `i` (code[i] is a quote). */
function skipString(code, i) {
  const quote = code[i];
  const raw = code[i - 1] === "r" && !isIdentChar(code[i - 2]);
  const triple = code.startsWith(quote.repeat(3), i);
  let p = i + (triple ? 3 : 1);
  while (p < code.length) {
    const ch = code[p];
    if (!raw && ch === "\\") { p += 2; continue; }
    if (!raw && ch === "$" && code[p + 1] === "{") { p = skipInterpolation(code, p + 2); continue; }
    if (triple) {
      if (code.startsWith(quote.repeat(3), p)) return p + 3;
    } else if (ch === quote) {
      return p + 1;
    } else if (ch === "\n") {
      return p; // unterminated: recover at end of line
    }
    p += 1;
  }
  return code.length;
}

/** Index just after the "}" closing a "${" interpolation whose body starts at `i`. */
function skipInterpolation(code, i) {
  let depth = 1;
  let p = i;
  while (p < code.length) {
    const ch = code[p];
    if (ch === "'" || ch === '"') { p = skipString(code, p); continue; }
    if (ch === "{") depth += 1;
    else if (ch === "}") { depth -= 1; if (depth === 0) return p + 1; }
    p += 1;
  }
  return code.length;
}

function skipComment(code, i) {
  if (code[i] === "/" && code[i + 1] === "/") {
    const eol = code.indexOf("\n", i);
    return eol === -1 ? code.length : eol + 1;
  }
  if (code[i] === "/" && code[i + 1] === "*") {
    const end = code.indexOf("*/", i + 2);
    return end === -1 ? code.length : end + 2;
  }
  return i;
}

/** Index just after the "}" matching the "{" at `open`, or -1 if unbalanced. */
function matchBrace(code, open) {
  let depth = 0;
  let p = open;
  while (p < code.length) {
    const ch = code[p];
    if (ch === "'" || ch === '"') { p = skipString(code, p); continue; }
    if (ch === "/" && (code[p + 1] === "/" || code[p + 1] === "*")) { p = skipComment(code, p); continue; }
    if (ch === "{") depth += 1;
    else if (ch === "}") { depth -= 1; if (depth === 0) return p + 1; }
    p += 1;
  }
  return -1;
}

function lineStarts(code) {
  const starts = [0];
  for (let i = 0; i < code.length; i += 1) if (code[i] === "\n") starts.push(i + 1);
  return starts;
}

function lineOf(starts, index) {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= index) lo = mid; else hi = mid - 1;
  }
  return lo + 1;
}

const CLASS_RE = /^(?:@\w+(?:\([^)]*\))?\s*)*(?:(?:abstract|final|base|sealed|interface|mixin)\s+)*(class|mixin|enum|extension)\s+(\w+)?/;

function memberName(signature) {
  const sig = signature.replace(/^(?:@\w+(?:\([^)]*\))?\s*)+/, "").trim();
  const getter = sig.match(/\b(?:get|set)\s+([A-Za-z_$][\w$]*)/);
  if (getter) return getter[1];
  // "final entities = <T>[...]" / "Foo x = Foo(...)": a declaration named by what is assigned.
  const assign = sig.match(/([A-Za-z_$][\w$]*)\s*=(?!>)/);
  const firstParen = sig.indexOf("(");
  if (assign && (firstParen === -1 || sig.indexOf(assign[0]) < firstParen)) return assign[1];
  const call = sig.match(/([A-Za-z_$][\w$]*)\s*(?:<[^>(]*>)?\s*\(/);
  if (call && !/^(?:if|for|while|switch|return)$/.test(call[1])) return call[1];
  const field = sig.match(/([A-Za-z_$][\w$]*)\s*(?:=|;|$)/);
  return field ? field[1] : "";
}

/** Scan one container (file or class body) and return its direct members. */
function scanContainer(code, from, to, parent) {
  const blocks = [];
  let i = from;
  let start = -1;
  let paren = 0;
  let arrow = false;
  let assign = false;
  const reset = () => { start = -1; paren = 0; arrow = false; assign = false; };

  while (i < to) {
    const ch = code[i];
    if (ch === "/" && (code[i + 1] === "/" || code[i + 1] === "*")) { i = skipComment(code, i); continue; }
    if (start === -1) {
      if (/\s/.test(ch) || ch === ";") { i += 1; continue; }
      start = i;
    }
    if (ch === "'" || ch === '"') { i = skipString(code, i); continue; }
    if (ch === "(" || ch === "[") paren += 1;
    else if (ch === ")" || ch === "]") paren = Math.max(0, paren - 1);
    else if (ch === "=" && code[i + 1] === ">" && paren === 0) { arrow = true; i += 2; continue; }
    else if (ch === "=" && paren === 0 && !/[=!<>]/.test(code[i - 1] || "") && code[i + 1] !== "=") assign = true;
    else if (ch === "{") {
      const end = matchBrace(code, i);
      if (end === -1 || end > to) break;
      if (paren === 0 && !arrow && !assign) {
        const signature = code.slice(start, i);
        const classMatch = signature.match(CLASS_RE);
        const block = { start, end, parent };
        if (classMatch) {
          block.kind = "class";
          block.name = classMatch[2] || classMatch[1];
          block.children = scanContainer(code, i + 1, end - 1, block.name);
        } else {
          block.kind = parent ? "method" : "function";
          block.name = memberName(signature);
        }
        blocks.push(block);
        i = end;
        reset();
        continue;
      }
      i = end;
      continue;
    } else if (ch === ";" && paren === 0) {
      const signature = code.slice(start, i);
      if (arrow || assign || /\(/.test(signature)) {
        blocks.push({ start, end: i + 1, parent, kind: arrow ? (parent ? "method" : "function") : "field", name: memberName(signature) });
      }
      i += 1;
      reset();
      continue;
    }
    i += 1;
  }
  return blocks;
}

/**
 * Flat list of every function/method/class-without-members in the file:
 * { kind, name, parent, start, end, startLine, endLine, length }.
 */
function buildOutline(code = "") {
  const text = String(code);
  const starts = lineStarts(text);
  const leaves = [];
  const visit = (blocks) => {
    for (const block of blocks) {
      if (block.kind === "class" && block.children && block.children.length) { visit(block.children); continue; }
      if (block.kind === "field" && block.end - block.start < 120) continue; // tiny fields are noise
      leaves.push({
        kind: block.kind,
        name: block.name,
        parent: block.parent || "",
        start: block.start,
        end: block.end,
        startLine: lineOf(starts, block.start),
        endLine: lineOf(starts, Math.max(block.start, block.end - 1)),
        length: block.end - block.start,
      });
    }
  };
  visit(scanContainer(text, 0, text.length, ""));
  return leaves;
}

/** True when every ( [ { in the file is closed in order (strings and comments ignored). */
function isBalanced(code = "") {
  const text = String(code);
  const closers = { ")": "(", "]": "[", "}": "{" };
  const stack = [];
  let p = 0;
  while (p < text.length) {
    const ch = text[p];
    if (ch === "'" || ch === '"') { p = skipString(text, p); continue; }
    if (ch === "/" && (text[p + 1] === "/" || text[p + 1] === "*")) { p = skipComment(text, p); continue; }
    if (ch === "(" || ch === "[" || ch === "{") stack.push(ch);
    else if (closers[ch]) { if (stack.pop() !== closers[ch]) return false; }
    p += 1;
  }
  return stack.length === 0;
}

module.exports = { buildOutline, matchBrace, skipString, lineStarts, lineOf, isBalanced };
