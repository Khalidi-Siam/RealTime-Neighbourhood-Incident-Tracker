const User = require('../models/user-model');
const Comment = require('../models/comment-model');
const Incident = require('../models/incident-model');
const Vote = require('../models/vote-model');
const IncidentReport = require('../models/false-report-model');
const Notification = require('../models/notification-model');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/jwt-utils');

const register = async (req, res) => {
    try {
        const { username, email, phone, password } = req.body;

        const userExists = await User.findOne({ email: email });

        if(userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }
  
        const newUser = await User.create({
            username,
            email,
            phone,
            password
        });

        // Generate JWT token
        const token = generateToken(newUser._id);

        res.status(201).json({ 
            message: 'User registered successfully',
            token,
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role
            }
        });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Generate JWT token
        const token = generateToken(user._id);

        res.status(200).json({ 
            message: 'Login successful', 
            token,
            user: { 
                id: user._id, 
                username: user.username, 
                email: user.email,
                role: user.role
            } 
        });

    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

const getProfile = async (req, res) => {
    try {
        // req.user is set by the authenticateToken middleware
        res.status(200).json({
            message: 'Profile retrieved successfully',
            user: {
                id: req.user._id,
                username: req.user.username,
                email: req.user.email,
                phone: req.user.phone,
                role: req.user.role
            }
        });
    } catch (error) {
        console.error('Error retrieving profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

// Admin gets all users (excluding other admins)
const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '' } = req.query;
        const skip = (page - 1) * limit;

        // Build query filter - exclude admin users and optionally search
        const filter = { 
            role: { $ne: 'admin' } // Exclude admin users
        };

        // Add search functionality
        if (search.trim()) {
            filter.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        // Get users with pagination
        const users = await User.find(filter)
            .select('-password') // Exclude password field
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 }) // Latest users first
            .lean();

        const total = await User.countDocuments(filter);

        res.status(200).json({
            message: 'Users retrieved successfully',
            users: users,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalUsers: total,
                hasNext: page * limit < total,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Admin gets total user count
const getUsersCount = async (req, res) => {
    try {
        // Count all users excluding admin users
        const totalUsers = await User.countDocuments({ 
            role: { $ne: 'admin' } 
        });

        res.status(200).json({
            message: 'User count retrieved successfully',
            totalUsers: totalUsers
        });

    } catch (error) {
        console.error('Error getting users count:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const updateProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const { username, email, phone, currentPassword, newPassword } = req.body;

        // Find the current user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if email or username is being changed and already exists
        if (email && email !== user.email) {
            const emailExists = await User.findOne({ email: email, _id: { $ne: userId } });
            if (emailExists) {
                return res.status(400).json({ message: 'Email already exists' });
            }
        }

        if (username && username !== user.username) {
            const usernameExists = await User.findOne({ username: username, _id: { $ne: userId } });
            if (usernameExists) {
                return res.status(400).json({ message: 'Username already exists' });
            }
        }

        // Handle password change
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ message: 'Current password is required to change password' });
            }

            // Verify current password
            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
            if (!isCurrentPasswordValid) {
                return res.status(400).json({ message: 'Current password is incorrect' });
            }

            // Hash new password
            const saltRounds = await bcrypt.genSalt(10);
            const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
            user.password = hashedNewPassword;
        }

        // Update other fields
        if (username) user.username = username;
        if (email) user.email = email;
        if (phone) user.phone = phone;

        // Save the updated user
        await user.save();

        res.status(200).json({
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                phone: user.phone,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const deleteProfile = async (req, res) => {
    try {
        const userId = req.user._id;

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Don't allow admin users to delete their profiles through this endpoint
        if (user.role === 'admin') {
            return res.status(403).json({ message: 'Admin accounts cannot be deleted through this endpoint' });
        }

        // Start deletion process - Remove all related data
        // 1. Delete all comments by this user
        await Comment.deleteMany({ user: userId });

        // 2. Delete all incidents submitted by this user
        await Incident.deleteMany({ submittedBy: userId });

        // 3. Delete all votes by this user
        await Vote.deleteMany({ user: userId });

        // 4. Delete all false reports by this user
        await IncidentReport.deleteMany({ reportedBy: userId });

        // 5. Delete all notifications for this user
        await Notification.deleteMany({ toUser: userId });

        // 6. Finally, delete the user account
        await User.findByIdAndDelete(userId);

        res.status(200).json({
            message: 'Profile and all related data deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Admin deletes a specific user
const adminDeleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const adminId = req.user._id;

        // Check if the user to be deleted exists
        const userToDelete = await User.findById(userId);
        if (!userToDelete) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent admin from deleting themselves
        if (userId === adminId.toString()) {
            return res.status(400).json({ message: 'Admin cannot delete their own account through this endpoint' });
        }

        // Prevent admin from deleting other admin users
        if (userToDelete.role === 'admin') {
            return res.status(403).json({ message: 'Cannot delete other admin accounts' });
        }

        // Start deletion process - Remove all related data (same as user self-delete)
        // 1. Delete all comments by this user
        await Comment.deleteMany({ user: userId });

        // 2. Delete all incidents submitted by this user
        await Incident.deleteMany({ submittedBy: userId });

        // 3. Delete all votes by this user
        await Vote.deleteMany({ user: userId });

        // 4. Delete all false reports by this user
        await IncidentReport.deleteMany({ reportedBy: userId });

        // 5. Delete all notifications for this user
        await Notification.deleteMany({ toUser: userId });

        // 6. Finally, delete the user account
        await User.findByIdAndDelete(userId);

        res.status(200).json({
            message: `User ${userToDelete.username} and all related data deleted successfully`
        });

    } catch (error) {
        console.error('Error deleting user by admin:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    register,
    login,
    getProfile,
    getAllUsers,
    getUsersCount,
    updateProfile,
    deleteProfile,
    adminDeleteUser
};