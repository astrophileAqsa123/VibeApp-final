const Prompt = require("../models/Prompt");

// CREATE prompt
exports.createPrompt = async (req, res) => {
  try {
    const prompt = await Prompt.create({
      userId: req.user.id,
      text: req.body.text
    });

    res.status(201).json(prompt);
  } catch (err) {
    console.error("Create prompt error:", err);
    res.status(500).json({ message: "Failed to save prompt" });
  }
};

// GET ALL prompts of logged-in user
exports.getUserPrompts = async (req, res) => {
  try {
    const prompts = await Prompt.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(prompts);
  } catch (err) {
    console.error("List prompts error:", err);
    res.status(500).json({ message: "Failed to fetch prompts" });
  }
};

// GET single prompt
exports.getSinglePrompt = async (req, res) => {
  try {
    const prompt = await Prompt.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!prompt) {
      return res.status(404).json({ message: "Prompt not found" });
    }

    res.json(prompt);
  } catch (err) {
    console.error("Get prompt error:", err);
    res.status(500).json({ message: "Failed to fetch prompt" });
  }
};
