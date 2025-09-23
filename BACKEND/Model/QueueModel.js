// Model/QueueModel.js (CORRECTED)
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Counter = require('./Counter');
const { pad } = require('../utils/seq');

const QueueSchema = new Schema({
  queueCode: { type: String, unique: true, sparse: true, index: true },
  appointmentCode: { type: String, required: true, index: true },
  patientCode: { type: String, required: true, index: true },
  dentistCode: { type: String, required: true, index: true },
  
  // FIXED: Store actual appointment datetime (not just date at 00:00:00)
  date: { type: Date, required: true, index: true }, // Full appointment datetime
  
  position: { type: Number, required: true },
  
  // Only these 5 status values (dentist controls manually)
  status: { 
    type: String, 
    enum: ['waiting', 'called', 'in_treatment', 'completed', 'no_show'], 
    default: 'waiting', 
    index: true 
  },
  
  // Timestamp fields for status changes
  calledAt: Date,
  startedAt: Date,
  completedAt: Date,
  
  // Optional: Track time changes for Update button functionality
  originalTime: Date,      // Original appointment time
  previousTime: Date,      // Previous time before update
  
}, { timestamps: true });

// Indexes for efficient querying
QueueSchema.index({ dentistCode: 1, date: 1 });
QueueSchema.index({ status: 1, date: 1 });

QueueSchema.pre('save', async function(next){
  if (this.isNew && !this.queueCode) {
    const c = await Counter.findOneAndUpdate(
      { scope: 'queue' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.queueCode = `Q-${pad(c.seq, 4)}`;
  }
  
  // Store original time on first save (for tracking time switches)
  if (this.isNew && !this.originalTime) {
    this.originalTime = this.date;
  }
  
  next();
});

module.exports = mongoose.model('Queue', QueueSchema);