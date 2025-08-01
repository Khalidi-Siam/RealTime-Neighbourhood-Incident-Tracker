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

        if (existingVote) {
            // If same vote type, remove the vote (toggle off)
            if (existingVote.voteType === voteType) {
                await Vote.findByIdAndDelete(existingVote._id);
                return res.status(200).json({ 
                    message: 'Vote removed successfully',
                    action: 'removed',
                    previousVote: existingVote.voteType
                });
            } else {
                // Update to new vote type
                existingVote.voteType = voteType;
                await existingVote.save();
                return res.status(200).json({ 
                    message: 'Vote updated successfully',
                    action: 'updated',
                    previousVote: existingVote.voteType === 'upvote' ? 'downvote' : 'upvote',
                    currentVote: voteType
                });
            }
        } else {
            // Create new vote
            const newVote = new Vote({
                incident: incidentId,
                user: userId,
                voteType
            });

            await newVote.save();
            return res.status(201).json({ 
                message: 'Vote added successfully',
                action: 'added',
                currentVote: voteType
            });
        }

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
