const User = require('../models/user-model');
const { verifyToken } = require('../utils/jwt-utils');

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                message: 'Access denied. No token provided or invalid format.' 
            });
        }

        const token = authHeader.substring(7); // Remove "Bearer " prefix
        
        const decoded = verifyToken(token);
        
        // Get user information and attach to request
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            return res.status(401).json({ 
                message: 'Access denied. User not found.' 
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error.message);
        return res.status(401).json({ 
            message: 'Access denied. Invalid token.' 
        });
    }
};

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                message: 'Access denied. Authentication required.' 
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: 'Access denied. Insufficient permissions.' 
            });
        }

        next();
    };
};

const optionalAuthentication = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // No token provided, continue without authentication
            req.user = null;
            return next();
        }

        const token = authHeader.substring(7); // Remove "Bearer " prefix
        
        const decoded = verifyToken(token);
        
        // Get user information and attach to request
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            // Invalid user, continue without authentication
            req.user = null;
            return next();
        }

        req.user = user;
        next();
    } catch (error) {
        // Token verification failed, continue without authentication
        req.user = null;
        next();
    }
};

// Middleware to check if user is either the owner of the resource or an admin
const authorizeOwnerOrAdmin = (userIdParam = 'userId') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                message: 'Access denied. Authentication required.' 
            });
        }

        const resourceUserId = req.params[userIdParam] || req.user._id.toString();
        const currentUserId = req.user._id.toString();
        const userRole = req.user.role;

        // Allow if user is admin or if user is the owner of the resource
        if (userRole === 'admin' || currentUserId === resourceUserId) {
            return next();
        }

        return res.status(403).json({ 
            message: 'Access denied. You can only access your own resources or need admin privileges.' 
        });
    };
};

module.exports = {
    authenticateToken,
    authorizeRoles,
    optionalAuthentication,
    authorizeOwnerOrAdmin
};
