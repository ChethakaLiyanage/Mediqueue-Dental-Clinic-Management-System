const mongoose = require("mongoose");

const LeaveSchema = new mongoose.Schema({
  
  dentistCode: { type: String, required: true, index: true },
  dentistName: { type: String },
  dateFrom: { type: Date, required: true },
  dateTo: { type: Date, required: true },
  reason: { type: String, default: "Not available" },
  createdBy: { type: String }, // receptionist or dentist who added
}, { timestamps: true });

module.exports = mongoose.model("Leave", LeaveSchema);
