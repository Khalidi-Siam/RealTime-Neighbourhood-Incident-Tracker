const User = require('../models/user-model');
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

module.exports = {
    register,
    login,
    getProfile,
    getAllUsers,
    getUsersCount
};