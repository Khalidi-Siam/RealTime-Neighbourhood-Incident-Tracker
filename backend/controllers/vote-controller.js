const Vote = require('../models/vote-model');
const Incident = require('../models/incident-model');

const voteIncident = async (req, res) => {
    try {
        const { incidentId } = req.params;
        const { voteType } = req.body;
        const userId = req.user.id;

        // Validate incident exists
        const incident = await Incident.findById(incidentId);
        if (!incident) {
            return res.status(404).json({ message: 'Incident not found' });
        }

        // Check if user has already voted on this incident
        const existingVote = await Vote.findOne({ 
            incident: incidentId, 
            user: userId 
        });

        let action, currentVote = null, previousVote = null;

        if (existingVote) {
            // If same vote type, remove the vote (toggle off)
            if (existingVote.voteType === voteType) {
                await Vote.findByIdAndDelete(existingVote._id);
                action = 'removed';
                previousVote = existingVote.voteType;
                currentVote = null;
            } else {
                // Update to new vote type
                previousVote = existingVote.voteType;
                existingVote.voteType = voteType;
                await existingVote.save();
                action = 'updated';
                currentVote = voteType;
            }
        } else {
            // Create new vote
            const newVote = new Vote({
                incident: incidentId,
                user: userId,
                voteType
            });

            await newVote.save();
            action = 'added';
            currentVote = voteType;
        }

        // Get updated vote counts
        const upvotes = await Vote.countDocuments({ 
            incident: incidentId, 
            voteType: 'upvote' 
        });
        
        const downvotes = await Vote.countDocuments({ 
            incident: incidentId, 
            voteType: 'downvote' 
        });

        const responseData = {
            message: `Vote ${action} successfully`,
            action,
            currentVote,
            votes: {
                upvotes,
                downvotes,
                total: upvotes + downvotes,
                userVote: currentVote
            }
        };

        if (previousVote) {
            responseData.previousVote = previousVote;
        }

        // Emit real-time event to all clients
        const io = req.app.get('io');
        if (io) {
            // Emit to incidents room for map/feed updates
            // Don't include userVote in broadcast - each client should determine this individually
            io.to('incidents').emit('incident-vote-updated', {
                type: 'vote-updated',
                incidentId,
                votes: {
                    upvotes,
                    downvotes,
                    total: upvotes + downvotes
                    // userVote is NOT included in broadcast
                },
                action,
                voteType: action === 'removed' ? previousVote : voteType, // Include what type of vote was cast
                voterId: userId, // Include voter ID so clients can determine if it's their vote
                message: `Vote ${action} on incident`
            });

            // Emit to specific incident room for detailed view updates
            io.to(`incident-${incidentId}`).emit('vote-updated', {
                type: 'vote-updated',
                incidentId,
                votes: {
                    upvotes,
                    downvotes,
                    total: upvotes + downvotes
                    // userVote is NOT included in broadcast
                },
                action,
                voteType: action === 'removed' ? previousVote : voteType, // Include what type of vote was cast
                voterId: userId, // Include voter ID so clients can determine if it's their vote
                message: `Vote ${action}`
            });
        }

        res.status(action === 'added' ? 201 : 200).json(responseData);

    } catch (error) {
        console.error('Error voting on incident:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getIncidentVotes = async (req, res) => {
    try {
        const { incidentId } = req.params;

        // Validate incident exists
        const incident = await Incident.findById(incidentId);
        if (!incident) {
            return res.status(404).json({ message: 'Incident not found' });
        }

        // Get vote counts
        const upvotes = await Vote.countDocuments({ 
            incident: incidentId, 
            voteType: 'upvote' 
        });
        
        const downvotes = await Vote.countDocuments({ 
            incident: incidentId, 
            voteType: 'downvote' 
        });

        // Get user's vote if authenticated
        let userVote = null;
        if (req.user) {
            const vote = await Vote.findOne({ 
                incident: incidentId, 
                user: req.user.id 
            });
            userVote = vote ? vote.voteType : null;
        }

        res.status(200).json({
            message: 'Vote counts retrieved successfully',
            votes: {
                upvotes,
                downvotes,
                total: upvotes + downvotes,
                userVote
            }
        });

    } catch (error) {
        console.error('Error getting incident votes:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getUserVoteOnIncident = async (req, res) => {
    try {
        const { incidentId } = req.params;
        const userId = req.user.id;

        // Validate incident exists
        const incident = await Incident.findById(incidentId);
        if (!incident) {
            return res.status(404).json({ message: 'Incident not found' });
        }

        const vote = await Vote.findOne({ 
            incident: incidentId, 
            user: userId 
        });

        res.status(200).json({
            message: 'User vote retrieved successfully',
            userVote: vote ? vote.voteType : null,
            hasVoted: !!vote
        });

    } catch (error) {
        console.error('Error getting user vote:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    voteIncident,
    getIncidentVotes,
    getUserVoteOnIncident
};
