const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PrescriptionHistorySchema = new Schema({
  event: { 
    type: String, 
    required: true,
    enum: ["create", "update", "revise", "patient_seen", "activate", "deactivate"]
  },
  patientCode: { type: String, required: true, index: true },
  planCode: { type: String, required: true, index: true },
  prescriptionCode: { type: String, required: true, index: true },
  version: { type: Number, required: true },
  actorDentistCode: { type: String }, // Who made the change
  actorPatientCode: { type: String }, // If patient action
  snapshot: { type: Object, required: true }, // Full prescription at time of change
  note: { type: String, trim: true },
}, { timestamps: true });

// Index for efficient queries
PrescriptionHistorySchema.index({ patientCode: 1, prescriptionCode: 1 });
PrescriptionHistorySchema.index({ event: 1, createdAt: -1 });

module.exports = mongoose.model("PrescriptionHistory", PrescriptionHistorySchema);