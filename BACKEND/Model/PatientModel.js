const mongoose = require("mongoose");
const Counter = require("./Counter");
const { pad } = require("../utils/seq");

const toUpper = (value) => (typeof value === "string" ? value.trim().toUpperCase() : undefined);
const toLower = (value) => (typeof value === "string" ? value.trim().toLowerCase() : undefined);
const trim = (value) => (typeof value === "string" ? value.trim() : undefined);

const patientSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    patientCode: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
    nic: { type: String, required: true, unique: true, uppercase: true, trim: true, set: toUpper },
    dob: { type: Date, required: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true, set: toLower },
    address: { type: String, required: true, trim: true, set: trim },
    phone: { type: String, trim: true, set: trim },
    allergies: { type: String, trim: true, set: trim },
  },
  { timestamps: true }
);

patientSchema.pre("save", async function assignPatientCode(next) {
  if (!this.isNew || this.patientCode) return next();
  try {
    const counter = await Counter.findOneAndUpdate(
      { scope: "patient" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.patientCode = `P-${pad(counter.seq, 4)}`;
    return next();
  } catch (err) {
    return next(err);
  }
});

module.exports = mongoose.model("PatientModel", patientSchema);
