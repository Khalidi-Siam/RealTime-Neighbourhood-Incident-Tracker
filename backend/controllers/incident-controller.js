const Incident = require('../models/incident-model');
const Vote = require('../models/vote-model');
const Comment = require('../models/comment-model');
const IncidentReport = require('../models/false-report-model');
// const path = require('path');

const createIncident = async (req, res) => {
  try {
    const { title, description, address, lat, lng, category, severity } = req.body;
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
      severity: severity || 'Medium', // Default to Medium if not provided
      // image,
      submittedBy: userId
    });

    await newIncident.save();
    
    // Populate user information for the real-time event
    await newIncident.populate('submittedBy', 'username email');

    // Emit real-time event to all clients listening to incidents
    const io = req.app.get('io');
    if (io) {
      const incidentWithVotes = {
        ...newIncident.toObject(),
        id: newIncident._id.toString(),
        votes: {
          upvotes: 0,
          downvotes: 0,
          total: 0,
          userVote: null
        }
      };
      
      io.to('incidents').emit('new-incident', {
        type: 'incident-created',
        incident: incidentWithVotes,
        message: 'New incident reported'
      });
    }

    res.status(201).json({ message: 'Incident submitted successfully', incident: newIncident });

  } catch (err) {
    console.error("Error\n\n", err);
    res.status(500).json({ message: 'Server Error' });
  }
};

const getAllIncidents = async (req, res) => {
  try {
    // console.log('GET /api/incidents called with query:', JSON.stringify(req.query, null, 2));
    const { page = 1, limit = 10, category, severity, sortBy = 'timestamp', order = -1 } = req.query;
    const skip = (page - 1) * limit;

    // Build query filter
    const filter = {};
    if (category && category !== 'All' && category !== '') {
      filter.category = category;
    }
    if (severity && severity !== 'All' && severity !== '') {
      filter.severity = severity;
    }

    // Verify models
    if (!Incident || !Vote) {
      throw new Error('Incident or Vote model not defined');
    }

    // Build sort object for MongoDB query
    let mongoSort = {};
    const sortOrder = parseInt(order);
    
    if (sortBy === 'timestamp' || sortBy === 'timestampAsc') {
      mongoSort.timestamp = sortOrder;
    } else {
      // For vote-based sorting, we'll handle it after getting vote counts
      mongoSort.timestamp = -1; // Default to newest first for vote sorting
    }

    // Get incidents with filtering and sorting, but without pagination first for vote-based sorting
    let allFilteredIncidents;
    if (sortBy === 'votes.total' || sortBy === 'votes.upvotes') {
      // For vote-based sorting, we need all filtered incidents first
      allFilteredIncidents = await Incident.find(filter)
        .populate('submittedBy', 'username email')
        .lean();
    } else {
      // For timestamp sorting, we can apply pagination directly
      allFilteredIncidents = await Incident.find(filter)
        .populate('submittedBy', 'username email')
        .sort(mongoSort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();
    }

    // Get vote counts for incidents
    const incidentsWithVotes = await Promise.all(allFilteredIncidents.map(async (incident) => {
      const upvotes = await Vote.countDocuments({ 
        incident: incident._id, 
        voteType: 'upvote' 
      });
      const downvotes = await Vote.countDocuments({ 
        incident: incident._id, 
        voteType: 'downvote' 
      });

      let userVote = null;
      if (req.user) {
        const vote = await Vote.findOne({ 
          incident: incident._id, 
          user: req.user.id 
        });
        userVote = vote ? vote.voteType : null;
      }

      return {
        ...incident,
        id: incident._id.toString(),
        severity: incident.severity || 'Medium', // Ensure severity is always present
        votes: {
          upvotes,
          downvotes,
          total: upvotes + downvotes,
          userVote
        }
      };
    }));

    // Apply vote-based sorting and pagination if needed
    let finalIncidents = incidentsWithVotes;
    
    if (sortBy === 'votes.total') {
      finalIncidents.sort((a, b) => {
        return sortOrder === -1 ? (b.votes.total - a.votes.total) : (a.votes.total - b.votes.total);
      });
      // Apply pagination after sorting
      finalIncidents = finalIncidents.slice(skip, skip + parseInt(limit));
    } else if (sortBy === 'votes.upvotes') {
      finalIncidents.sort((a, b) => {
        return sortOrder === -1 ? (b.votes.upvotes - a.votes.upvotes) : (a.votes.upvotes - b.votes.upvotes);
      });
      // Apply pagination after sorting
      finalIncidents = finalIncidents.slice(skip, skip + parseInt(limit));
    }
    // For timestamp sorting, pagination was already applied in the query

    const total = await Incident.countDocuments(filter);

    const response = {
      message: 'Incidents retrieved successfully',
      incidents: finalIncidents,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalIncidents: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };

    // console.log('Sending response:', JSON.stringify(response, null, 2));
    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching incidents:', JSON.stringify(error, null, 2));
    res.status(500).json({ message: error.message || 'Server Error' });
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
      severity: incident.severity || 'Medium', // Ensure severity is always present
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

    // Check if user is authorized to delete (admin or incident owner)
    if (req.user.role !== 'admin' && incident.submittedBy.toString() !== req.user.id) {
      return res.status(403).json({ 
        message: 'Access denied. You can only delete your own incidents.' 
      });
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

    // Emit real-time event to all clients
    const io = req.app.get('io');
    if (io) {
      io.to('incidents').emit('incident-deleted', {
        type: 'incident-deleted',
        incidentId: id,
        message: 'Incident has been deleted'
      });
      
      // Also emit to the specific incident room if anyone is viewing it
      io.to(`incident-${id}`).emit('incident-deleted', {
        type: 'incident-deleted',
        incidentId: id,
        message: 'This incident has been deleted'
      });
    }

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