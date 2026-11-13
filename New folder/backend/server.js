require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const os = require("os");
const webPreviewManager = require("./services/webPreviewManager");
const apkBuildManager = require("./services/apkBuildManager");
const { createRateLimiter } = require("./middleware/rateLimit");

const app = express();

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "0.0.0.0";
const MONGO_URI = process.env.MONGO_URI;
const ADB_TARGET = process.env.ADB_TARGET || "emulator-5554";

console.log("MONGO_URI status:", MONGO_URI ? "FOUND" : "MISSING");

app.set("trust proxy", 1);

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "http://192.168.100.27:5173",
  "https://vibe-app-dun.vercel.app",
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
  process.env.PUBLIC_FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      const error = new Error("Origin is not allowed by CORS");
      error.status = 403;
      return callback(error);
    },
    credentials: true,
  })
);


// Public preview artifacts are mounted before the global X-Frame-Options middleware.
// Each preview URL contains an unguessable token and expires automatically.
const previewArtifactRoutes = require("./routes/previewArtifacts");
app.use("/previews", previewArtifactRoutes);

// Public APK pages/files are accessible only through short-lived random bearer tokens.
// APK files are no longer exposed through a predictable static /public/apks path.
const apkPublicRoutes = require("./routes/apkPublic");
app.use("/apk-download", apkPublicRoutes);

app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

app.use(createRateLimiter({ windowMs: 60_000, max: 120, prefix: "api" }));
app.use(express.json({ limit: process.env.REQUEST_BODY_LIMIT || "2mb" }));
app.use(express.urlencoded({
  extended: true,
  limit: process.env.REQUEST_BODY_LIMIT || "2mb",
}));

mongoose.connection.on("connected", () => {
  console.log("Mongoose event: connected");
});

mongoose.connection.on("disconnected", () => {
  console.log("Mongoose event: disconnected");
});

mongoose.connection.on("error", (error) => {
  console.log("Mongoose event error:", error.message);
});

async function connectMongoDB() {
  if (!MONGO_URI) {
    console.log("MongoDB skipped: MONGO_URI missing");
    return;
  }

  try {
    console.log("MongoDB connecting...");

    await mongoose.connect(MONGO_URI, {
      family: 4,
    });

    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    console.log(
      "Server is still running, but login/signup/prompt saving may fail."
    );
  }
}

connectMongoDB()
  .then(async () => {
    await Promise.all([webPreviewManager.start(), apkBuildManager.start()]);
  })
  .catch(() => {});

const authRoutes = require("./routes/auth");
const promptRoutes = require("./routes/prompt");
const aiRoutes = require("./routes/ai");
const emulatorRoutes = require("./routes/emulator");
const webPreviewRoutes = require("./routes/webPreview");
const projectRoutes = require("./routes/projects");
const apkRoutes = require("./routes/apk");
const templateGenerateRoutes = require("./routes/templateGenerate");
const mobilePreviewRoutes = require("./routes/mobilePreview");
const codeEditRoutes = require("./routes/codeEdit");

app.use("/api/auth", authRoutes);
app.use("/api/prompts", promptRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/emulator", emulatorRoutes);
app.use("/api/web-preview", webPreviewRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/apk", apkRoutes);
app.use("/api/generation", templateGenerateRoutes);
app.use("/api/mobile-preview", mobilePreviewRoutes);
app.use("/api/code-edit", codeEditRoutes);

try {
  const projectChatRoutes = require("./routes/projectChat");
  app.use("/api/projects", projectChatRoutes);
  console.log("Project chat route active: /api/projects/:projectId/chat");
} catch (error) {
  console.log("Project chat route skipped: routes/projectChat.js not found");
}

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "VibeApp backend is running",
    port: PORT,
    mongo: mongoose.connection.readyState === 1 ? "connected" : "not-connected",
    routes: {
      auth: "/api/auth",
      prompts: "/api/prompts",
      ai: "/api/ai",
      emulator: "/api/emulator",
      webPreview: "/api/web-preview",
      projects: "/api/projects",
      apk: "/api/apk",
      generation: "/api/generation",
      mobilePreview: "/api/mobile-preview",
      codeEdit: "/api/code-edit",
      codeEditFlutter: "/api/code-edit/flutter",
    },
    groqConfigured: Boolean(process.env.GROQ_API_KEY),
    maxGroqCodeChars: process.env.MAX_GROQ_CODE_CHARS || "18000",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "API healthy",
    mongo: mongoose.connection.readyState === 1 ? "connected" : "not-connected",
    generationRoute: "/api/generation",
    mobilePreviewRoute: "/api/mobile-preview",
    codeEditRoute: "/api/code-edit",
    codeEditFlutterRoute: "/api/code-edit/flutter",
    exactTemplateLibrary: "exact-500-common-unique-crud-template-library-v3",
    localTemplateEdit: true,
    time: new Date().toISOString(),
  });
});

app.get("/api/preview/status", (req, res) => {
  res.json({
    success: true,
    adbTarget: ADB_TARGET,
    message: "Preview backend available.",
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((error, req, res, next) => {
  console.error("Server error:", error);

  const status = Number(error.status || 500);
  const safeMessage = status < 500 ? error.message : "Internal server error";

  res.status(status).json({
    success: false,
    message: safeMessage,
  });
});

const server = app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  if (HOST === "0.0.0.0" || HOST === "::") {
    const lanUrls = [];
    for (const entries of Object.values(os.networkInterfaces())) {
      for (const item of entries || []) {
        const family = typeof item.family === "string" ? item.family : item.family === 4 ? "IPv4" : "";
        if (family === "IPv4" && !item.internal && item.address) {
          lanUrls.push(`http://${item.address}:${PORT}`);
        }
      }
    }
    if (lanUrls.length) console.log(`LAN access: ${lanUrls.join(" | ")}`);
  }
  console.log(`ADB target: ${ADB_TARGET}`);
  console.log("Generation route active: /api/generation");
  console.log("Exact 500 template library active");
  console.log("Mobile preview route active: /api/mobile-preview");
  console.log("Code edit route active: /api/code-edit");
  console.log("Code edit flutter route active: /api/code-edit/flutter");
});

// Preview builds now run asynchronously through the bounded preview manager, so API
// requests return immediately instead of keeping HTTP sockets open during Flutter builds.

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down...`);
  await webPreviewManager.stop();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
