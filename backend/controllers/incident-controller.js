const Incident = require('../models/incident-model');
const Vote = require('../models/vote-model');
const Comment = require('../models/comment-model');
const IncidentReport = require('../models/false-report-model');
// const path = require('path');

const createIncident = async (req, res) => {
  try {
    const { title, description, address, lat, lng, category } = req.body;
    const userId = req.user.id;

    // const image = req.file ? `/uploads/${req.file.filename}` : null;

    const newIncident = new Incident({
      title,
      description,
      location: { 
        address, 
        lat: parseFloat(lat), 
        lng: parseFloat(lng)
      },
      category,
      // image,
      submittedBy: userId
    });

    await newIncident.save();
    res.status(201).json({ message: 'Incident submitted successfully', incident: newIncident });

  } catch (err) {
    console.error("Error\n\n", err);
    res.status(500).json({ message: 'Server Error' });
  }
};

const getAllIncidents = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, sortBy = 'timestamp' } = req.query;
    const skip = (page - 1) * limit;

    // Build query filter
    const filter = {};
    if (category && category !== 'All') {
      filter.category = category;
    }

    // Get incidents with pagination
    const incidents = await Incident.find(filter)
      .populate('submittedBy', 'username email')
      .sort({ [sortBy]: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get vote counts for each incident
    const incidentsWithVotes = await Promise.all(incidents.map(async (incident) => {
      const upvotes = await Vote.countDocuments({ 
        incident: incident._id, 
        voteType: 'upvote' 
      });
      const downvotes = await Vote.countDocuments({ 
        incident: incident._id, 
        voteType: 'downvote' 
      });

      // Get user's vote if authenticated
      let userVote = null;
      if (req.user) {
        const vote = await Vote.findOne({ 
          incident: incident._id, 
          user: req.user.id 
        });
        userVote = vote ? vote.voteType : null;
      }

      return {
        ...incident.toObject(),
        votes: {
          upvotes,
          downvotes,
          total: upvotes + downvotes,
          userVote
        }
      };
    }));

    const total = await Incident.countDocuments(filter);

    res.status(200).json({
      message: 'Incidents retrieved successfully',
      incidents: incidentsWithVotes,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalIncidents: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const getIncidentById = async (req, res) => {
  try {
    const { id } = req.params;

    const incident = await Incident.findById(id)
      .populate('submittedBy', 'username email');

    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    // Get vote counts
    const upvotes = await Vote.countDocuments({ 
      incident: id, 
      voteType: 'upvote' 
    });
    const downvotes = await Vote.countDocuments({ 
      incident: id, 
      voteType: 'downvote' 
    });

    // Get user's vote if authenticated
    let userVote = null;
    if (req.user) {
      const vote = await Vote.findOne({ 
        incident: id, 
        user: req.user.id 
      });
      userVote = vote ? vote.voteType : null;
    }

    const incidentWithVotes = {
      ...incident.toObject(),
      votes: {
        upvotes,
        downvotes,
        total: upvotes + downvotes,
        userVote
      }
    };

    res.status(200).json({
      message: 'Incident retrieved successfully',
      incident: incidentWithVotes
    });

  } catch (error) {
    console.error('Error fetching incident:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const deleteIncident = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the incident
    const incident = await Incident.findById(id);
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    // Delete all related data
    await Promise.all([
      // Delete all comments for this incident
      Comment.deleteMany({ incident: id }),
      // Delete all votes for this incident
      Vote.deleteMany({ incident: id }),
      // Delete all false reports for this incident
      IncidentReport.deleteMany({ incidentId: id }),
      // Delete the incident itself
      Incident.findByIdAndDelete(id)
    ]);

    res.status(200).json({ 
      message: 'Incident and all related data deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting incident:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};


module.exports = {
    createIncident,
    getAllIncidents,
    getIncidentById,
    deleteIncident
};