const mongoose = require("mongoose");

const WebPreviewSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    publicToken: {
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
      default: "Queued for preview build.",
    },
    workspacePath: {
      type: String,
      default: "",
    },
    artifactPath: {
      type: String,
      default: "",
    },
    previewUrl: {
      type: String,
      default: "",
    },
    buildLogs: {
      type: String,
      default: "",
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

WebPreviewSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
WebPreviewSessionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("WebPreviewSession", WebPreviewSessionSchema);
