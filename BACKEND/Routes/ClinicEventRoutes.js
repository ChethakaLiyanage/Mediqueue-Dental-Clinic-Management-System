// backend/Routes/ClinicEventRoutes.js
const express = require("express");
const router = express.Router();

const ctrl = require("../Controllers/ClinicEventControllers");
const requireAuth = require("../Middleware/requireAuth");
const optionalAuth = require("../Middleware/optionalAuth");

// helper to avoid crashes if a controller isn't implemented
const ensureFn = (fn, name) =>
  typeof fn === "function" ? fn : (req, res) => res.status(501).json({ message: `${name} not implemented` });

// READ (public)
router.get("/", optionalAuth, ensureFn(ctrl.getAllEvents, "getAllEvents"));
router.get("/code/:eventCode", optionalAuth, ensureFn(ctrl.getByCode, "getByCode"));
router.get("/:id", optionalAuth, ensureFn(ctrl.getById, "getById"));

// WRITE (auth)
router.post("/", requireAuth, ensureFn(ctrl.addEvent, "addEvent"));
router.put("/:id", requireAuth, ensureFn(ctrl.updateEvent, "updateEvent"));
router.delete("/:id", requireAuth, ensureFn(ctrl.deleteEvent, "deleteEvent"));
router.put("/code/:eventCode", requireAuth, ensureFn(ctrl.updateByCode, "updateByCode"));
router.delete("/code/:eventCode", requireAuth, ensureFn(ctrl.deleteByCode, "deleteByCode"));

module.exports = router;
