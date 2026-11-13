const mongoose = require("mongoose");

const ApkBuildJobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      index: true,
    },
    codeHash: {
      type: String,
      required: true,
      index: true,
    },
    buildType: {
      type: String,
      enum: ["release"],
      default: "release",
    },
    signingMode: {
      type: String,
      enum: ["custom-release", "development-fallback"],
      default: "development-fallback",
    },
    status: {
      type: String,
      enum: ["queued", "building", "ready", "failed", "cancelled", "expired"],
      default: "queued",
      index: true,
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    message: {
      type: String,
      default: "Queued for APK build.",
    },
    code: {
      type: String,
      required: true,
      select: false,
    },
    workspacePath: {
      type: String,
      default: "",
    },
    artifactPath: {
      type: String,
      default: "",
    },
    artifactFileName: {
      type: String,
      default: "",
    },
    packageName: {
      type: String,
      default: "",
    },
    buildLogs: {
      type: String,
      default: "",
    },
    repairCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    recovered: {
      type: Boolean,
      default: false,
    },
    recoveryStrategy: {
      type: String,
      default: "",
    },
    servedFallbackVersion: {
      type: Number,
      default: 0,
    },
    repairAttempts: {
      type: [
        {
          attempt: Number,
          strategy: String,
          categories: [String],
          summary: String,
          changed: Boolean,
          at: Date,
        },
      ],
      default: [],
    },
    verificationStages: {
      analyze: { type: String, enum: ["pending", "passed", "failed", "skipped"], default: "pending" },
      apkBuild: { type: String, enum: ["pending", "passed", "failed", "skipped"], default: "pending" },
    },
    downloadTokenHash: {
      type: String,
      default: "",
      select: false,
      index: true,
    },
    downloadTokenExpiresAt: {
      type: Date,
      default: null,
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
    lastDownloadedAt: {
      type: Date,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

ApkBuildJobSchema.index({ user: 1, project: 1, codeHash: 1, createdAt: -1 });
ApkBuildJobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("ApkBuildJob", ApkBuildJobSchema);
