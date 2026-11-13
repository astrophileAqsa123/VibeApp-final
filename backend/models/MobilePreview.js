const mongoose = require("mongoose");

const MobilePreviewSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    prompt: {
      type: String,
      required: true,
    },

    schema: {
      type: Object,
      required: true,
    },

    generatedCode: {
      type: String,
      default: "",
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

MobilePreviewSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("MobilePreview", MobilePreviewSchema);