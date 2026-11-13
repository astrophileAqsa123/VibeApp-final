const mongoose = require("mongoose");

const promptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  text: {
    type: String,
    required: true
  }

}, { timestamps: true });

module.exports = mongoose.model("Prompt", promptSchema);