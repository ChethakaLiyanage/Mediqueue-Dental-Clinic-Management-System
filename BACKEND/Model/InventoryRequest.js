const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Counter = require("./Counter");
const { pad } = require("../utils/seq");

const InventoryItemSchema = new Schema(
  {
    itemName: { type: String, required: true, trim: true },
    itemCode: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const InventoryRequestSchema = new Schema(
  {
    dentistCode: { type: String, required: true, trim: true, index: true },
    // Auto-incrementing request code (RI-001, RI-002 ...)
    requestCode: { type: String, required: true, index: true },
    items: {
      type: [InventoryItemSchema],
      validate: [arr => Array.isArray(arr) && arr.length > 0, "At least one item is required"],
    },
    status: { type: String, enum: ["Pending", "Approved", "Rejected", "Fulfilled"], default: "Pending" },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

// Generate requestCode on create
InventoryRequestSchema.pre("validate", async function(next) {
  try {
    if (this.isNew && !this.requestCode) {
      const scope = `invreq`; // global counter for inventory requests

      // If all inventory requests were deleted, reset counter so we start at RI-001 again
      const total = await this.constructor.countDocuments({});
      if (total === 0) {
        await Counter.findOneAndUpdate(
          { scope },
          { $set: { seq: 0 } },
          { upsert: true }
        );
      }

      const c = await Counter.findOneAndUpdate(
        { scope },
        { $inc: { seq: 1 } },
        { upsert: true, new: true }
      );
      this.requestCode = `RI-${pad(c.seq, 3)}`;
    }
    next();
  } catch (e) {
    next(e);
  }
});

module.exports = mongoose.model("InventoryRequest", InventoryRequestSchema);

