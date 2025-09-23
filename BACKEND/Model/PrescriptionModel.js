// Model/PrescriptionModel.js
const mongoose = require("mongoose");

const prescriptionSchema = new mongoose.Schema({
  prescriptionCode: { type: String, required: true, unique: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
  dentistId: { type: mongoose.Schema.Types.ObjectId, ref: "Dentist", required: true },
  medicines: [
    {
      name: String,
      dosage: String,
      frequency: String,
      duration: String,
    },
  ],
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Prescription", prescriptionSchema);
