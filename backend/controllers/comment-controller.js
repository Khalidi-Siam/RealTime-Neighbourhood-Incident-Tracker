const Comment = require('../models/comment-model');

const createComment = async (req, res) => {
    try {
        const { text } = req.body;
        const userId = req.user.id;
        const { incidentId } = req.params;

        const newComment = new Comment({
            incident: incidentId,
            user: userId,
            text
        });

        await newComment.save();

        // Populate user information for the response
        await newComment.populate('user', 'username email');
        await newComment.populate('incident', 'title');

        // Emit real-time event to clients in the incident room
        const io = req.app.get('io');
        if (io) {
            io.to(`incident-${incidentId}`).emit('new-comment', {
                type: 'comment-created',
                comment: newComment,
                incidentId,
                message: `New comment by ${newComment.user.username}`
            });
        }

        res.status(201).json({ 
            message: 'Comment added successfully', 
            comment: newComment 
        });

    } catch (err) {
        console.error("Error creating comment:", err);
        res.status(500).json({ message: 'Server Error' });
    }
};

const getCommentsByIncident = async (req, res) => {
    try {
        const { incidentId } = req.params;

        const comments = await Comment.find({ incident: incidentId })
            .populate('user', 'username email')
            .sort({ createdAt: -1 });

        res.status(200).json({ 
            message: 'Comments retrieved successfully', 
            comments 
        });

    } catch (err) {
        console.error("Error fetching comments:", err);
        res.status(500).json({ message: 'Server Error' });
    }
};

const updateComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { text } = req.body;
        const userId = req.user.id;

        const comment = await Comment.findById(id);

        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        // Check if the user owns the comment
        if (comment.user.toString() !== userId) {
            return res.status(403).json({ message: 'Access denied. You can only edit your own comments.' });
        }

        comment.text = text;
        await comment.save();

        await comment.populate('user', 'username email');
        await comment.populate('incident', 'title');

        // Emit real-time event to clients in the incident room
        const io = req.app.get('io');
        if (io) {
            io.to(`incident-${comment.incident._id}`).emit('comment-updated', {
                type: 'comment-updated',
                comment: comment,
                incidentId: comment.incident._id,
                message: `Comment updated by ${comment.user.username}`
            });
        }

        res.status(200).json({ 
            message: 'Comment updated successfully', 
            comment 
        });

    } catch (err) {
        console.error("Error updating comment:", err);
        res.status(500).json({ message: 'Server Error' });
    }
};

const deleteComment = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        const comment = await Comment.findById(id);

        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        // Check if the user owns the comment or is an admin
        if (comment.user.toString() !== userId && userRole !== 'admin') {
            return res.status(403).json({ message: 'Access denied. You can only delete your own comments.' });
        }

        const incidentId = comment.incident;
        
        await Comment.findByIdAndDelete(id);

        // Emit real-time event to clients in the incident room
        const io = req.app.get('io');
        if (io) {
            io.to(`incident-${incidentId}`).emit('comment-deleted', {
                type: 'comment-deleted',
                commentId: id,
                incidentId: incidentId,
                message: 'Comment has been deleted'
            });
        }

        res.status(200).json({ 
            message: 'Comment deleted successfully' 
        });

    } catch (err) {
        console.error("Error deleting comment:", err);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    createComment,
    getCommentsByIncident,
    updateComment,
    deleteComment
};