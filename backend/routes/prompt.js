const express = require("express");
const router = express.Router();

const {
  createPrompt,
  getUserPrompts,
  getSinglePrompt
} = require("../controllers/promptController");

const auth = require("../middleware/authMiddleware");

// create prompt
router.post("/", auth, createPrompt);

// get all prompts for user
router.get("/", auth, getUserPrompts);

// get single prompt
router.get("/:id", auth, getSinglePrompt);

module.exports = router;