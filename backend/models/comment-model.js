const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  incident: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Comment', CommentSchema);
