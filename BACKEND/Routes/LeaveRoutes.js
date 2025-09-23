const express = require("express");
const leave_router = express.Router();
const LeaveController = require("../Controllers/DentistLeaveControllers");

leave_router.get("/", LeaveController.list);
leave_router.post("/", LeaveController.create);

module.exports = leave_router;


