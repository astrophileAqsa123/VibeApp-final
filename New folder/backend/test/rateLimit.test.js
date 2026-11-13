const test = require("node:test");
const assert = require("node:assert/strict");
const { createRateLimiter } = require("../middleware/rateLimit");

function response() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("rate limiter blocks requests above the configured maximum", () => {
  const limit = createRateLimiter({ windowMs: 60_000, max: 2, prefix: "test-limit" });
  const req = { ip: "127.0.0.77", headers: {}, socket: {} };
  let nextCalls = 0;
  limit(req, response(), () => { nextCalls += 1; });
  limit(req, response(), () => { nextCalls += 1; });
  const blocked = response();
  limit(req, blocked, () => { nextCalls += 1; });

  assert.equal(nextCalls, 2);
  assert.equal(blocked.statusCode, 429);
  assert.equal(blocked.body.success, false);
  assert.ok(blocked.headers["Retry-After"]);
});

test("authenticated users receive independent buckets", () => {
  const limit = createRateLimiter({ windowMs: 60_000, max: 1, prefix: "test-users" });
  let nextCalls = 0;
  limit({ user: { id: "one" } }, response(), () => { nextCalls += 1; });
  limit({ user: { id: "two" } }, response(), () => { nextCalls += 1; });
  assert.equal(nextCalls, 2);
});
