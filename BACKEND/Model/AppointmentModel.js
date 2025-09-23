const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Counter = require("./Counter");
const { pad } = require("../utils/seq");

const AppointmentSchema = new Schema(
  {
    // store codes (strings) instead of ObjectId refs
    patient_code:   { type: String, required: true, index: true },
    dentist_code:   { type: String, required: true, index: true },

    appointment_date: { type: Date, required: true, index: true }, // full date & time
    reason:           { type: String, trim: true },

    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },

    queue_no: { type: Number },

    // human-readable code: AP-0001, AP-0002, ...
    appointmentCode: { type: String, unique: true, sparse: true },

    reminders: {
      dayBeforeSentAt: { type: Date },
      twoHourSentAt:   { type: Date },
    },
  },
  { timestamps: true }
);

// unique per dentist per exact time (by code)
AppointmentSchema.index({ dentist_code: 1, appointment_date: 1 }, { unique: true });

// auto-generate AP-0001 style codes
AppointmentSchema.pre("save", async function (next) {
  if (this.isNew && !this.appointmentCode) {
    const c = await Counter.findOneAndUpdate(
      { scope: "appointment" },
      { $inc: { seq: 1 } },
      { upsert: true, new: true }
    );
    this.appointmentCode = `AP-${pad(c.seq, 4)}`; // AP-0001
  }
  next();
});

module.exports = mongoose.model("AppointmentModel", AppointmentSchema);