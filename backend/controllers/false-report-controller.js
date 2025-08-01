const IncidentReport = require('../models/false-report-model');
const Incident = require('../models/incident-model');

const createFalseReport = async (req, res) => {
    try {
        const { incidentId } = req.params;
        const { reason } = req.body;
        const userId = req.user.id;

        // Validate incident exists
        const incident = await Incident.findById(incidentId);
        if (!incident) {
            return res.status(404).json({ message: 'Incident not found' });
        }

        // Check if user has already reported this incident
        const existingReport = await IncidentReport.findOne({ 
            incidentId: incidentId, 
            reportedBy: userId 
        });

        if (existingReport) {
            return res.status(400).json({ 
                message: 'You have already reported this incident as false' 
            });
        }

        // Prevent users from reporting their own incidents
        if (incident.submittedBy.toString() === userId) {
            return res.status(400).json({ 
                message: 'You cannot report your own incident as false' 
            });
        }

        // Create new false report
        const newReport = new IncidentReport({
            incidentId: incidentId,
            reportedBy: userId,
            reason: reason || 'Possibly false or spam'
        });

        await newReport.save();

        // Update incident's isFalseFlagged status
        if (!incident.isFalseFlagged) {
            incident.isFalseFlagged = true;
            await incident.save();
        }

        res.status(201).json({ 
            message: 'False report submitted successfully',
            report: {
                id: newReport._id,
                incidentId: newReport.incidentId,
                reason: newReport.reason,
                timestamp: newReport.timestamp
            }
        });

    } catch (error) {
        console.error('Error creating false report:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getUserReportOnIncident = async (req, res) => {
    try {
        const { incidentId } = req.params;
        const userId = req.user.id;

        // Validate incident exists
        const incident = await Incident.findById(incidentId);
        if (!incident) {
            return res.status(404).json({ message: 'Incident not found' });
        }

        const report = await IncidentReport.findOne({ 
            incidentId: incidentId, 
            reportedBy: userId 
        });

        res.status(200).json({
            message: 'User report status retrieved successfully',
            hasReported: !!report,
            report: report ? {
                id: report._id,
                reason: report.reason,
                timestamp: report.timestamp
            } : null
        });

    } catch (error) {
        console.error('Error getting user report:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Admin accepts a false report
const acceptFalseReport = async (req, res) => {
    try {
        const { incidentId } = req.params;

        // Find the incident
        const incident = await Incident.findById(incidentId);
        if (!incident) {
            return res.status(404).json({ message: 'Incident not found' });
        }

        // Update incident flags
        incident.falseFlagVerified = true;
        incident.isFalseFlagged = false;
        await incident.save();

        res.status(200).json({ 
            message: 'False report accepted successfully',
            incident: {
                id: incident._id,
                falseFlagVerified: incident.falseFlagVerified,
                isFalseFlagged: incident.isFalseFlagged
            }
        });

    } catch (error) {
        console.error('Error accepting false report:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Admin rejects a false report
const rejectFalseReport = async (req, res) => {
    try {
        const { incidentId } = req.params;

        // Find the incident
        const incident = await Incident.findById(incidentId);
        if (!incident) {
            return res.status(404).json({ message: 'Incident not found' });
        }

        // Update incident flags
        incident.falseFlagVerified = false;
        incident.isFalseFlagged = false;
        await incident.save();

        res.status(200).json({ 
            message: 'False report rejected successfully',
            incident: {
                id: incident._id,
                falseFlagVerified: incident.falseFlagVerified,
                isFalseFlagged: incident.isFalseFlagged
            }
        });

    } catch (error) {
        console.error('Error rejecting false report:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    createFalseReport,
    getUserReportOnIncident,
    acceptFalseReport,
    rejectFalseReport
};
