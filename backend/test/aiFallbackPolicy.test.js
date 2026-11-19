const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isClaudeTokenQuotaExhausted,
  shouldFallbackToGroq,
} = require('../services/aiFallbackPolicy');

test('falls back only for explicit Claude account/token quota exhaustion', () => {
  assert.equal(
    isClaudeTokenQuotaExhausted(
      new Error('Claude API 400: Your credit balance is too low to access the API.')
    ),
    true
  );

  assert.equal(
    isClaudeTokenQuotaExhausted(
      new Error('Claude API 400: token quota has been exceeded')
    ),
    true
  );
});

test('does not fallback for ordinary Claude failures', () => {
  const ordinaryFailures = [
    new Error('Claude returned an empty response.'),
    new Error('Claude response was truncated because it reached max_tokens.'),
    new Error('Claude API 429: rate limit exceeded'),
    new Error('Claude API 500: internal server error'),
    new Error('Claude API 400: invalid request'),
    new Error('Claude API 400: prompt is too large for the context window'),
    new Error('network timeout while calling Claude'),
  ];

  for (const error of ordinaryFailures) {
    assert.equal(shouldFallbackToGroq(error), false, error.message);
  }
});

test('does not treat max_tokens as account quota exhaustion', () => {
  const error = new Error(
    'Claude response was truncated because it reached max_tokens.'
  );
  error.code = 'CLAUDE_OUTPUT_MAX_TOKENS';
  assert.equal(isClaudeTokenQuotaExhausted(error), false);
});
