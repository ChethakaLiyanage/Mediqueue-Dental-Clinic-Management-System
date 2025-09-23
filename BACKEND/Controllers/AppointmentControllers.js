const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const Appointment = require("../Model/AppointmentModel");
const OtpToken = require("../Model/OtpToken");
const Patient = require("../Model/PatientModel");
const Dentist = require("../Model/DentistModel");
const User = require("../Model/User");
const Leave = require("../Model/LeaveModel");
const { sendSms, normalizePhone } = require("../utils/sms");

const OTP_EXPIRY_MS = Number(process.env.APPOINTMENT_OTP_EXPIRY_MS || 5 * 60 * 1000);
const OTP_MESSAGE_PREFIX = process.env.APPOINTMENT_OTP_SMS_PREFIX || "Your Medi Queue verification code is";

function toDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function generateOtp() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function resolveDentistCode({ dentistCode, doctorId }) {
  if (dentistCode) return { dentistCode };
  if (!doctorId) return { dentistCode: null };

  const dentist = await Dentist.findById(doctorId).lean();
  if (!dentist) return { dentistCode: doctorId, dentistName: null };

  return {
    dentistCode: dentist.dentistCode || dentist._id.toString(),
    dentistName: dentist.name,
  };
}

// Get available appointment slots for a dentist
const getAvailableSlots = async (req, res) => {
  try {
    const { dentistCode, date, durationMinutes = 30 } = req.query;
    
    if (!dentistCode) {
      return res.status(400).json({ message: "dentistCode is required" });
    }
    
    if (!date) {
      return res.status(400).json({ message: "date is required (YYYY-MM-DD format)" });
    }

    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
    }

    // Check if dentist is on leave for this date
    const isOnLeave = await Leave.isDentistOnLeave(dentistCode, targetDate);
    if (isOnLeave) {
      return res.status(200).json({
        date: date,
        dentistCode: dentistCode,
        availableSlots: [],
        message: "Dentist is not available on this date"
      });
    }

    // Get dentist info
    const dentist = await Dentist.findOne({ dentistCode }).lean();
    if (!dentist) {
      return res.status(404).json({ message: "Dentist not found" });
    }

    // Define working hours (you can make this configurable per dentist)
    const workingHours = {
      start: 9, // 9 AM
      end: 17,  // 5 PM
      slotDuration: parseInt(durationMinutes) || 30 // minutes
    };

    // Generate all possible time slots for the day
    const allSlots = [];
    const startTime = new Date(targetDate);
    startTime.setHours(workingHours.start, 0, 0, 0);
    
    const endTime = new Date(targetDate);
    endTime.setHours(workingHours.end, 0, 0, 0);

    let currentSlot = new Date(startTime);
    while (currentSlot < endTime) {
      allSlots.push(new Date(currentSlot));
      currentSlot.setMinutes(currentSlot.getMinutes() + workingHours.slotDuration);
    }

    // Get all booked appointments for this dentist on this date
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedAppointments = await Appointment.find({
      dentist_code: dentistCode,
      appointment_date: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      status: { $in: ["pending", "confirmed"] } // exclude cancelled/completed
    }).lean();

    // Filter out booked slots
    const bookedTimes = bookedAppointments.map(apt => apt.appointment_date.getTime());
    const availableSlots = allSlots.filter(slot => {
      return !bookedTimes.includes(slot.getTime());
    });

    // Format slots for frontend
    const formattedSlots = availableSlots.map(slot => ({
      time: slot.toISOString(),
      displayTime: slot.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })
    }));

    return res.status(200).json({
      date: date,
      dentistCode: dentistCode,
      dentistName: dentist.name,
      availableSlots: formattedSlots,
      totalSlots: formattedSlots.length,
      workingHours: workingHours
    });

  } catch (error) {
    console.error("getAvailableSlots error:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

const bookAppointment = async (req, res) => {
  try {
    const { patient_code, dentist_code, appointment_date, reason, status, queue_no } = req.body || {};

    if (!patient_code) return res.status(400).json({ message: "patient_code is required" });
    if (!dentist_code) return res.status(400).json({ message: "dentist_code is required" });

    const appointmentDate = toDate(appointment_date);
    if (!appointmentDate) {
      return res.status(400).json({ message: "appointment_date must be a valid ISO datetime" });
    }

    // Check if dentist is on leave for this date
    const isOnLeave = await Leave.isDentistOnLeave(dentist_code, appointmentDate);
    if (isOnLeave) {
      return res.status(400).json({ 
        message: "Cannot book appointment. Dentist is not available on this date." 
      });
    }

    // Check if slot is already booked
    const existingAppointment = await Appointment.findOne({
      dentist_code,
      appointment_date: appointmentDate,
      status: { $in: ["pending", "confirmed"] }
    });

    if (existingAppointment) {
      return res.status(409).json({
        message: "This time slot is already booked for this dentist.",
        conflictOn: ["dentist_code", "appointment_date"],
      });
    }

    const doc = await Appointment.create({
      patient_code,
      dentist_code,
      appointment_date: appointmentDate,
      reason: reason?.trim() || "",
      status,
      queue_no,
    });

    return res.status(201).json({ appointment: doc });
  } catch (err) {
    if (err?.code === 11000 && err?.keyPattern?.dentist_code && err?.keyPattern?.appointment_date) {
      return res.status(409).json({
        message: "This dentist is already booked for that exact time.",
        conflictOn: ["dentist_code", "appointment_date"],
      });
    }

    return res.status(500).json({ message: err.message });
  }
};

const listAppointments = async (req, res) => {
  try {
    const { patient_code, dentist_code, status, from, to } = req.query || {};
    const filter = {};

    if (patient_code) filter.patient_code = String(patient_code);
    if (dentist_code) filter.dentist_code = String(dentist_code);
    if (status) filter.status = String(status);

    const fromDate = toDate(from);
    const toDateValue = toDate(to);
    if (fromDate || toDateValue) {
      filter.appointment_date = {};
      if (fromDate) filter.appointment_date.$gte = fromDate;
      if (toDateValue) filter.appointment_date.$lte = toDateValue;
    }

    const items = await Appointment.find(filter).sort({ appointment_date: 1 }).lean();
    return res.status(200).json({ items, count: items.length });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = ["patient_code", "dentist_code", "appointment_date", "reason", "status", "queue_no"];
    const patch = {};

    for (const field of allowed) {
      if (field in req.body) {
        patch[field] = field === "appointment_date" ? toDate(req.body[field]) : req.body[field];
      }
    }

    if ("appointment_date" in patch && !patch.appointment_date) {
      return res.status(400).json({ message: "appointment_date must be a valid ISO datetime" });
    }

    const updated = await Appointment.findByIdAndUpdate(id, patch, {
      new: true,
      runValidators: true,
    });

    if (!updated) return res.status(404).json({ message: "Appointment not found" });
    return res.status(200).json({ appointment: updated });
  } catch (err) {
    if (err?.code === 11000 && err?.keyPattern?.dentist_code && err?.keyPattern?.appointment_date) {
      return res.status(409).json({
        message: "This dentist is already booked for that exact time.",
        conflictOn: ["dentist_code", "appointment_date"],
      });
    }

    return res.status(500).json({ message: err.message });
  }
};

const deleteAppointment = async (req, res) => {
  try {
    const removed = await Appointment.findByIdAndDelete(req.params.id).lean();
    if (!removed) return res.status(404).json({ message: "Appointment not found" });
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const sendAppointmentOtp = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { slotIso, durationMinutes, dentistCode, doctorId, doctorName, reason } = req.body || {};
    if (!slotIso) return res.status(400).json({ message: "slotIso is required" });

    const appointmentDate = toDate(slotIso);
    if (!appointmentDate) return res.status(400).json({ message: "slotIso must be a valid ISO datetime" });

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    const patient = await Patient.findOne({ userId }).lean();
    if (!patient || !patient.patientCode) {
      return res.status(400).json({ message: "Patient profile is incomplete. Cannot send OTP." });
    }

    const normalizedPhone = normalizePhone(user.phone || patient.phone);
    if (!normalizedPhone) {
      return res.status(400).json({ message: "Phone number is missing or invalid. Update your profile with a valid number." });
    }

    const dentistInfo = await resolveDentistCode({ dentistCode, doctorId });
    const dentistCodeValue = dentistInfo.dentistCode || dentistCode || doctorId || "UNKNOWN";
    const dentistDisplayName = doctorName || dentistInfo.dentistName || dentistCodeValue;

    const otp = generateOtp();
    const codeHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    const otpRecord = await OtpToken.create({
      userId,
      context: "appointment",
      codeHash,
      expiresAt,
      data: {
        patient_code: patient.patientCode,
        dentist_code: dentistCodeValue,
        appointment_date: appointmentDate.toISOString(),
        durationMinutes: Number(durationMinutes) || 30,
        doctorId: doctorId || null,
        doctorName: dentistDisplayName,
        reason: normalizeText(reason),
      },
    });

    try {
      const smsResult = await sendSms({
        to: normalizedPhone,
        body: `${OTP_MESSAGE_PREFIX} ${otp}. It expires in ${Math.round(OTP_EXPIRY_MS / 60000)} minutes.`,
      });

      return res.status(200).json({
        message: "OTP sent successfully",
        otpId: otpRecord._id,
        expiresAt: expiresAt.toISOString(),
        sentPhone: smsResult?.to || normalizedPhone,
      });
    } catch (err) {
      await otpRecord.deleteOne();
      console.error("Failed to send OTP SMS:", err);
      const errorMessage = process.env.NODE_ENV === "production" ? "Failed to send OTP SMS. Please try again later." : `Failed to send OTP SMS: ${err.message || err}`;
      return res.status(500).json({ message: errorMessage });
    }
  } catch (err) {
    console.error("sendAppointmentOtp error:", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

const verifyAppointmentOtp = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { otpId, code, reason } = req.body || {};
    if (!otpId || !code) return res.status(400).json({ message: "otpId and code are required" });

    const otpRecord = await OtpToken.findOne({ _id: otpId, userId, context: "appointment" });
    if (!otpRecord) return res.status(400).json({ message: "Invalid or expired OTP" });

    if (otpRecord.expiresAt < new Date()) {
      await otpRecord.deleteOne().catch(() => {});
      return res.status(400).json({ message: "OTP has expired" });
    }

    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      await otpRecord.deleteOne().catch(() => {});
      return res.status(429).json({ message: "Too many invalid attempts. Request a new OTP." });
    }

    const isMatch = await bcrypt.compare(String(code), otpRecord.codeHash);
    if (!isMatch) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const payload = otpRecord.data || {};
    const appointmentDate = toDate(payload.appointment_date);
    if (!appointmentDate) {
      await otpRecord.deleteOne().catch(() => {});
      return res.status(400).json({ message: "Stored appointment data is invalid" });
    }

    // Check if dentist is on leave for this date
    const isOnLeave = await Leave.isDentistOnLeave(payload.dentist_code, appointmentDate);
    if (isOnLeave) {
      await otpRecord.deleteOne().catch(() => {});
      return res.status(400).json({ 
        message: "Cannot confirm appointment. Dentist is not available on this date." 
      });
    }

    // Check if slot is still available
    const existingAppointment = await Appointment.findOne({
      dentist_code: payload.dentist_code,
      appointment_date: appointmentDate,
      status: { $in: ["pending", "confirmed"] }
    });

    if (existingAppointment) {
      await otpRecord.deleteOne().catch(() => {});
      return res.status(409).json({
        message: "This time slot is no longer available. Please select a different time.",
        conflictOn: ["dentist_code", "appointment_date"],
      });
    }

    const booking = {
      patient_code: payload.patient_code,
      dentist_code: payload.dentist_code,
      appointment_date: appointmentDate,
      reason: normalizeText(reason) || payload.reason || "",
      status: "confirmed",
    };

    try {
      const appointment = await Appointment.create(booking);
      await otpRecord.deleteOne().catch(() => {});
      return res.status(201).json({ message: "Appointment confirmed", appointment });
    } catch (err) {
      if (err?.code === 11000 && err?.keyPattern?.dentist_code && err?.keyPattern?.appointment_date) {
        await otpRecord.deleteOne().catch(() => {});
        return res.status(409).json({
          message: "This dentist is already booked for that exact time.",
          conflictOn: ["dentist_code", "appointment_date"],
        });
      }
      throw err;
    }
  } catch (err) {
    console.error("verifyAppointmentOtp error:", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

module.exports = {
  bookAppointment,
  listAppointments,
  updateAppointment,
  deleteAppointment,
  sendAppointmentOtp,
  verifyAppointmentOtp,
  getAvailableSlots,
};

