// Routes/ReceptionistRoutes.js
const express = require("express");
const router = express.Router();

const Receptionist = require("../Model/ReceptionistModel");
const ReceptionistController = require("../Controllers/ReceptionistControllers");

// GET all
router.get("/", ReceptionistController.getAllReceptionists);

// CREATE
router.post("/", ReceptionistController.addReceptionists);

// ✅ NEW: resolve code by userId (used once after login)
router.get("/by-user/:userId", async (req, res) => {
  try {
    const rc = await Receptionist.findOne({ userId: req.params.userId }, "receptionistCode").lean();
    if (!rc) return res.status(404).json({ message: "Not a receptionist" });
    res.json({ receptionistCode: rc.receptionistCode });
  } catch (e) {
    res.status(500).json({ message: "Server error", error: e.message });
  }
});

// OPTIONAL: get by receptionistCode
router.get("/code/:code", ReceptionistController.getByCode);

// GET by id
router.get("/:id", ReceptionistController.getById);

// UPDATE
router.put("/:id", ReceptionistController.updateReceptionist);

// DELETE
router.delete("/:id", ReceptionistController.deleteReceptionist);

module.exports = router;
