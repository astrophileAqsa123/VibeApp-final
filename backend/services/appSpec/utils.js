function clone(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function toIdentifier(value = "", fallback = "item") {
  const words = String(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return fallback;
  const identifier = words
    .map((word, index) => index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
  return /^[a-zA-Z_]/.test(identifier) ? identifier : `${fallback}${identifier}`;
}

function titleCase(value = "") {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function pluralize(value = "Record") {
  const word = String(value || "Record").trim();
  if (/^person$/i.test(word)) return word === 'person' ? 'people' : 'People';
  if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/i.test(word)) return `${word}es`;
  return `${word}s`;
}

function uniqueStrings(values = [], limit = 100) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))].slice(0, limit);
}

function normalizeHex(value, fallback) {
  const text = String(value || "").trim();
  if (/^#[0-9a-f]{6}$/i.test(text)) return text.toUpperCase();
  if (/^[0-9a-f]{6}$/i.test(text)) return `#${text.toUpperCase()}`;
  return fallback;
}

function luminance(hex) {
  const values = [1, 3, 5].map((offset) => {
    const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
}

function contrastRatio(a, b) {
  const first = luminance(a);
  const second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

module.exports = { clone, toIdentifier, titleCase, pluralize, uniqueStrings, normalizeHex, contrastRatio };
