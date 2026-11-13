const buckets = new Map();

function clientKey(req) {
  return String(
    req.user?.id || req.user?.userId || req.ip || req.socket?.remoteAddress || "unknown"
  );
}

function createRateLimiter({ windowMs = 60_000, max = 60, prefix = "global" } = {}) {
  return (req, res, next) => {
    const now = Date.now();
    const key = `${prefix}:${clientKey(req)}`;
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, max - bucket.count);
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please wait and try again.",
      });
    }

    return next();
  };
}

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 5 * 60_000);
cleanupTimer.unref?.();

module.exports = { createRateLimiter };
