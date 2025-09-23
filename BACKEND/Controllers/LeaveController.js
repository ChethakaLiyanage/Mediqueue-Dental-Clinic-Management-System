// Controllers/LeaveController.js
const Leave = require("../Model/LeaveModel");

// ✅ Dentist adds his own leave
async function addLeave(req, res) {
  try {
    const { dentistCode, dentistName, dateFrom, dateTo, reason } = req.body;

    if (!dentistCode || !dateFrom || !dateTo) {
      return res.status(400).json({ message: "dentistCode, dateFrom, dateTo required" });
    }

    const leave = await Leave.create({
      dentistCode,
      dentistName,
      dateFrom,
      dateTo,
      reason,
      createdBy: dentistCode, // ✅ dentist himself
    });

    return res.status(201).json(leave);
  } catch (err) {
    console.error("Error adding dentist leave:", err);
    return res.status(500).json({ message: "Failed to add leave" });
  }
}

// ✅ Dentist reads only his leaves
async function listLeaves(req, res) {
  try {
    const { dentistCode } = req.query;
    const q = dentistCode ? { dentistCode } : {};
    const items = await Leave.find(q).sort({ dateFrom: -1 });
    return res.json(items);
  } catch (err) {
    console.error("Error listing dentist leaves:", err);
    return res.status(500).json({ message: "Failed to list leaves" });
  }
}

module.exports = { addLeave, listLeaves };
