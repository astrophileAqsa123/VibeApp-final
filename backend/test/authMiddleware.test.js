const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/authMiddleware");

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("authentication rejects a missing bearer token", () => {
  const res = response();
  auth({ headers: {} }, res, () => assert.fail("next should not run"));
  assert.equal(res.statusCode, 401);
});

test("authentication accepts a valid HS256 bearer token", () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "test-secret-with-sufficient-entropy";
  try {
    const token = jwt.sign({ id: "user-1" }, process.env.JWT_SECRET, { algorithm: "HS256" });
    const req = { headers: { authorization: `Bearer ${token}` } };
    let called = false;
    auth(req, response(), () => { called = true; });
    assert.equal(called, true);
    assert.equal(req.user.id, "user-1");
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});
