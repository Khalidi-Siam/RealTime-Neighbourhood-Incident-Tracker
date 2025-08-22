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

        // Check if incident has been flagged as false
        if (!incident.isFalseFlagged) {
            return res.status(400).json({ message: 'This incident has not been reported as false' });
        }

        // Update incident flags - keep in feed/map but mark as verified false
        incident.falseFlagVerified = true;
        incident.isFalseFlagged = false; // Remove from admin pending list
        await incident.save();

        // Emit real-time event to all clients
        const io = req.app.get('io');
        if (io) {
            // Emit to incidents room for map/feed updates
            io.to('incidents').emit('incident-false-report-accepted', {
                type: 'false-report-accepted',
                incidentId: incident._id,
                incident: {
                    _id: incident._id,
                    falseFlagVerified: incident.falseFlagVerified,
                    isFalseFlagged: incident.isFalseFlagged
                },
                message: 'Incident marked as false report'
            });
        }

        res.status(200).json({ 
            message: 'False report accepted successfully. Incident will remain visible but marked as false.',
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

        // Emit real-time event to all clients
        const io = req.app.get('io');
        if (io) {
            // Emit to incidents room for map/feed updates
            io.to('incidents').emit('incident-false-report-rejected', {
                type: 'false-report-rejected',
                incidentId: incident._id,
                incident: {
                    _id: incident._id,
                    falseFlagVerified: incident.falseFlagVerified,
                    isFalseFlagged: incident.isFalseFlagged
                },
                message: 'False report rejected, incident restored'
            });
        }

        res.status(200).json({ 
            message: 'False report rejected successfully. Incident restored to normal status.',
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

// Admin gets all reported incidents
const getAllReportedIncidents = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        // Get all incidents that have been reported as false
        const reportedIncidents = await Incident.find({ 
            isFalseFlagged: true 
        })
        .populate('submittedBy', 'username email')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ timestamp: -1 })
        .lean();

        // For each incident, get the false reports
        const incidentsWithReports = await Promise.all(
            reportedIncidents.map(async (incident) => {
                const reports = await IncidentReport.find({ incidentId: incident._id })
                    .populate('reportedBy', 'username email')
                    .sort({ timestamp: -1 });

                return {
                    ...incident,
                    reports: reports.map(report => ({
                        id: report._id,
                        reason: report.reason,
                        timestamp: report.timestamp,
                        reportedBy: report.reportedBy
                    })),
                    reportCount: reports.length
                };
            })
        );

        const total = await Incident.countDocuments({ isFalseFlagged: true });

        res.status(200).json({
            message: 'Reported incidents retrieved successfully',
            incidents: incidentsWithReports,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalIncidents: total,
                hasNext: page * limit < total,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        console.error('Error getting reported incidents:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    createFalseReport,
    getUserReportOnIncident,
    acceptFalseReport,
    rejectFalseReport,
    getAllReportedIncidents
};
