const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  location: {
    address: { type: String },
    lat: { type: Number },
    lng: { type: Number }
  },
  // image: { type: String }, // image URL or path
  category: { type: String, enum: ['Crime', 'Accident', 'Lost', 'Utility', 'Other'], required: true },
  severity: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  timestamp: { type: Date, default: Date.now },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  isFalseFlagged: { type: Boolean, default: false }, // true if user reports as false
  falseFlagVerified: { type: Boolean, default: false }, // true if admin confirms it's false
});

const Incident = mongoose.model('Incident', incidentSchema);
module.exports = Incident;
