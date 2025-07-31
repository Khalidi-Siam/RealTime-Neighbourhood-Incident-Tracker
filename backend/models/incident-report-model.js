const IncidentReportSchema = new mongoose.Schema({
  incidentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident', required: true },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, default: 'Possibly false or spam' },
  timestamp: { type: Date, default: Date.now }
});

const IncidentReport = mongoose.model('IncidentReport', IncidentReportSchema);
module.exports = IncidentReport;