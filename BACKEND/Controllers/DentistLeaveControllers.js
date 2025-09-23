const Leave = require("../Model/LeaveModel");

// GET /leave (optional dentistCode)
exports.list = async (req, res) => {
  try {
    const filter = {};
    if (req.query.dentistCode) filter.dentistCode = String(req.query.dentistCode).trim();
    const items = await Leave.find(filter).sort({ dateFrom: -1 }).lean();
    return res.status(200).json({ items });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch leave" });
  }
};

// POST /leave
exports.create = async (req, res) => {
  try {
    const { dentistCode, dentistName, dateFrom, dateTo, reason } = req.body || {};
    if (!dentistCode || !dentistName || !dateFrom || !dateTo) {
      return res.status(400).json({ message: "dentistCode, dentistName, dateFrom, dateTo are required" });
    }
    const doc = await Leave.create({
      dentistCode: String(dentistCode).trim(),
      dentistName: String(dentistName).trim(),
      dateFrom: new Date(dateFrom),
      dateTo: new Date(dateTo),
      reason: reason || "",
    });
    return res.status(201).json({ leave: doc });
  } catch (err) {
    return res.status(500).json({ message: "Failed to create leave" });
  }
};


