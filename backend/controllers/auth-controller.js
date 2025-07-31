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

module.exports = {
    register,
    login,
    getProfile
};