// Routes/FeedbackRoutes.js
const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/requireAuth");

const {
  addFeedbacks,
  getAllFeedbacks,
  getById,
  getUserReviews,
  updateFeedback,
  deleteFeedback,
} = require("../Controllers/FeedbackControllers");

// Create feedback (protected route)
router.post("/", requireAuth, addFeedbacks);

// List all feedback
router.get("/", getAllFeedbacks);

// Get user's reviews (protected route) - MUST come before /:id route
router.get("/my-reviews", requireAuth, getUserReviews);

// Get single feedback by id
router.get("/:id", getById);

// Update feedback (protected route)
router.put("/:id", requireAuth, updateFeedback);

// Delete feedback (protected route)
router.delete("/:id", requireAuth, deleteFeedback);

module.exports = router;
