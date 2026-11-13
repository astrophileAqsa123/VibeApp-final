const mongoose = require("mongoose");

const ProjectMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    content: {
      type: String,
      default: "",
    },
    source: {
      type: String,
      default: "",
    },
    generatedCode: {
      type: String,
      default: "",
    },
    storageMode: {
      type: String,
      default: "local",
      enum: ["local", "supabase"],
    },
    tableSql: {
      type: String,
      default: "",
    },
    supabaseTable: {
      type: String,
      default: "",
    },
    appConfig: {
      type: Object,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const ProjectVersionSchema = new mongoose.Schema(
  {
    version: {
      type: Number,
      default: 1,
    },
    prompt: {
      type: String,
      default: "",
    },
    source: {
      type: String,
      default: "",
    },
    generatedCode: {
      type: String,
      default: "",
    },
    appSpec: {
      type: Object,
      default: null,
    },
    requirements: {
      type: [Object],
      default: [],
    },
    componentPlan: {
      type: [Object],
      default: [],
    },
    fileManifest: {
      type: [Object],
      default: [],
    },
    entrypoint: {
      type: String,
      default: "lib/main.dart",
    },
    storageMode: {
      type: String,
      default: "local",
      enum: ["local", "supabase"],
    },
    tableSql: {
      type: String,
      default: "",
    },
    supabaseTable: {
      type: String,
      default: "",
    },
    appConfig: {
      type: Object,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const ProjectSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    title: {
      type: String,
      default: "Untitled Project",
      trim: true,
    },
    prompt: {
      type: String,
      default: "",
    },
    latestPrompt: {
      type: String,
      default: "",
    },
    generatedCode: {
      type: String,
      default: "",
    },
    currentCode: {
      type: String,
      default: "",
    },
    lastKnownGoodCode: {
      type: String,
      default: "",
      select: false,
    },
    lastKnownGoodVersion: {
      type: Number,
      default: 0,
    },
    lastKnownGoodAt: {
      type: Date,
      default: null,
    },
    previewType: {
      type: String,
      default: "web",
    },
    status: {
      type: String,
      default: "generated",
    },
    generationSource: {
      type: String,
      default: "",
    },
    version: {
      type: Number,
      default: 1,
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
    storageMode: {
      type: String,
      default: "local",
      enum: ["local", "supabase"],
    },
    supabaseUrl: {
      type: String,
      default: "",
    },
    supabaseAnonKey: {
      type: String,
      default: "",
    },
    supabaseTable: {
      type: String,
      default: "",
    },
    tableSql: {
      type: String,
      default: "",
    },
    appConfig: {
      type: Object,
      default: null,
    },
    appSpec: {
      type: Object,
      default: null,
    },
    requirements: {
      type: [Object],
      default: [],
    },
    componentPlan: {
      type: [Object],
      default: [],
    },
    fileManifest: {
      type: [Object],
      default: [],
    },
    entrypoint: {
      type: String,
      default: "lib/main.dart",
    },
    messages: {
      type: [ProjectMessageSchema],
      default: [],
    },
    versions: {
      type: [ProjectVersionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    strict: false,
    optimisticConcurrency: true,
  }
);

ProjectSchema.pre("validate", function limitEmbeddedHistory() {
  const maxMessages = Number(process.env.MAX_PROJECT_MESSAGES || 100);
  const maxVersions = Number(process.env.MAX_PROJECT_VERSIONS || 20);
  if (Array.isArray(this.messages) && this.messages.length > maxMessages) {
    this.messages = this.messages.slice(-maxMessages);
  }
  if (Array.isArray(this.versions) && this.versions.length > maxVersions) {
    this.versions = this.versions.slice(-maxVersions);
  }
});

module.exports =
  mongoose.models.Project || mongoose.model("Project", ProjectSchema);
