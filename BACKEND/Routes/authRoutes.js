// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const { register, login, me, updateProfile, createManager } = require("../Controllers/AuthControllers");
const requireAuth = require("../middleware/requireAuth");

// Routes
router.post("/register", register);
router.post("/login", login);
router.post("/create-manager", createManager);
router.get("/me", requireAuth, me);
router.put("/me", requireAuth, updateProfile);

module.exports = router;