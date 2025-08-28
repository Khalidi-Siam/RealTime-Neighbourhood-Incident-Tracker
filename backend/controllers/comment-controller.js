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
                incidentId
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

        // Get top-level comments (those without parent)
        const topLevelComments = await Comment.find({ 
            incident: incidentId, 
            parentComment: null 
        })
            .populate('user', 'username email')
            .populate({
                path: 'replies',
                populate: {
                    path: 'user',
                    select: 'username email'
                }
            })
            .sort({ createdAt: -1 });

        // Function to recursively populate nested replies
        const populateNestedReplies = async (comments) => {
            for (let comment of comments) {
                if (comment.replies && comment.replies.length > 0) {
                    // Populate nested replies recursively
                    await Comment.populate(comment.replies, {
                        path: 'replies',
                        populate: {
                            path: 'user',
                            select: 'username email'
                        }
                    });
                    
                    // Sort replies by creation date
                    comment.replies.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                    
                    // Recursively populate nested replies
                    await populateNestedReplies(comment.replies);
                }
            }
        };

        await populateNestedReplies(topLevelComments);

        res.status(200).json({ 
            message: 'Comments retrieved successfully', 
            comments: topLevelComments 
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
                incidentId: comment.incident._id
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
        
        // If this is a reply, remove it from parent's replies array
        if (comment.parentComment) {
            await Comment.findByIdAndUpdate(
                comment.parentComment,
                { $pull: { replies: comment._id } }
            );
        }

        // Delete all nested replies recursively
        const deleteRepliesRecursively = async (commentId) => {
            const replies = await Comment.find({ parentComment: commentId });
            for (let reply of replies) {
                await deleteRepliesRecursively(reply._id);
                await Comment.findByIdAndDelete(reply._id);
            }
        };

        await deleteRepliesRecursively(id);
        
        // Delete the comment itself
        await Comment.findByIdAndDelete(id);

        // Emit real-time event to clients in the incident room
        const io = req.app.get('io');
        if (io) {
            io.to(`incident-${incidentId}`).emit('comment-deleted', {
                type: 'comment-deleted',
                commentId: id,
                incidentId: incidentId
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

const createReply = async (req, res) => {
    try {
        const { text } = req.body;
        const userId = req.user.id;
        const { commentId } = req.params;

        // Check if parent comment exists
        const parentComment = await Comment.findById(commentId);
        if (!parentComment) {
            return res.status(404).json({ message: 'Parent comment not found' });
        }

        const newReply = new Comment({
            incident: parentComment.incident,
            user: userId,
            text,
            parentComment: commentId
        });

        await newReply.save();

        // Add reply to parent comment's replies array
        parentComment.replies.push(newReply._id);
        await parentComment.save();

        // Populate user information for the response
        await newReply.populate('user', 'username email');
        await newReply.populate('incident', 'title');
        await newReply.populate('parentComment', 'text');

        // Emit real-time event to clients in the incident room
        const io = req.app.get('io');
        if (io) {
            io.to(`incident-${parentComment.incident}`).emit('new-reply', {
                type: 'reply-created',
                reply: newReply,
                parentCommentId: commentId,
                incidentId: parentComment.incident
            });
        }

        res.status(201).json({ 
            message: 'Reply added successfully', 
            reply: newReply 
        });

    } catch (err) {
        console.error("Error creating reply:", err);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    createComment,
    getCommentsByIncident,
    updateComment,
    deleteComment,
    createReply
};