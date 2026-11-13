const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const authorization = String(req.headers.authorization || "");
  const match = authorization.match(/^Bearer\s+([^\s]+)$/i);
  const token = match?.[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  if (!process.env.JWT_SECRET) {
    console.error("Authentication is unavailable: JWT_SECRET is not configured");
    return res.status(503).json({
      success: false,
      message: "Authentication service is temporarily unavailable",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
    if (!decoded?.id && !decoded?.userId) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
    req.user = decoded;
    return next();
  } catch (_) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

module.exports = authMiddleware;
