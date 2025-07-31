const mongoose = require('mongoose');

const VoteSchema = new mongoose.Schema({
  incident: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  voteType: { type: String, enum: ['upvote', 'downvote'], required: true },
}, { timestamps: true });

VoteSchema.index({ incident: 1, user: 1 }, { unique: true }); // only one vote per user per incident

module.exports = mongoose.model('Vote', VoteSchema);
