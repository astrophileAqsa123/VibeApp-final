# Rules for changes in this repo

1. Never break a passing test. If a test must change because behavior intentionally changed, say why in the commit message.
2. Extend the existing modules instead of creating parallel copies: services/sampleData, services/ai/entityFieldInference.js, services/codeOutline.js, services/codeEditContext.js, services/ai/editContext.js.
3. Output stays deterministic (no Math.random) so tests stay stable.
4. Before finishing run `node --test test/*.test.js` and `npm run check`, and report the results compared to BASELINE.md.
