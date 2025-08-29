const rateLimit = require('express-rate-limit');

// General rate limiter for all API endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for certain conditions
  skip: (req, res) => {
    // Skip rate limiting for health check endpoint
    if (req.path === '/' || req.path === '/health') return true;
    
    // Skip endpoints that have their own specific rate limiting
    const skipPaths = [
      '/login',          // Authentication endpoints
      '/register',       // Authentication endpoints
      '/vote',           // Voting endpoints
      '/report-false',   // False report endpoints
      '/comments'        // Comment creation endpoints
    ];
    
    // Check if the request path contains any of the skip patterns
    return skipPaths.some(path => req.path.includes(path));
  },
});

// Strict rate limiter for authentication endpoints (login, register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each email to 5 authentication attempts per windowMs
  message: {
    message: 'Too many authentication attempts for this email, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests from being counted
  skipSuccessfulRequests: true,
  // Use a sliding window counter for more accurate rate limiting
  skipFailedRequests: false,
  // Use email-based tracking for proper user isolation
  keyGenerator: (req) => {
    // For login/register, use email address for tracking
    const email = req.body?.email;
    if (email) {
      return `auth_${email.toLowerCase()}`;
    }
    // Fallback to IP if no email provided (shouldn't happen for valid requests)
    return `auth_ip_${req.ip}`;
  },
});

// Moderate rate limiter for content creation endpoints
const createContentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 content creation requests per windowMs
  message: {
    message: 'Too many content creation requests from this IP, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use a custom key generator to combine IP and user ID for better isolation
  keyGenerator: (req) => {
    // If user is authenticated, use IP + user ID for more precise limiting
    if (req.user && req.user.id) {
      return `${req.ip}_user_${req.user.id}`;
    }
    // Fallback to IP only for unauthenticated requests
    return req.ip;
  },
});

// Strict rate limiter for voting and reporting actions
const actionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // Limit each IP to 30 voting/reporting actions per 5 minutes
  message: {
    message: 'Too many voting/reporting actions from this IP, please try again after 5 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use a custom key generator to combine IP and user ID for better isolation
  keyGenerator: (req) => {
    // If user is authenticated, use IP + user ID for more precise limiting
    if (req.user && req.user.id) {
      return `${req.ip}_user_${req.user.id}`;
    }
    // Fallback to IP only for unauthenticated requests
    return req.ip;
  },
});

// Very strict rate limiter for false report submissions
const falseReportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 false report submissions per hour
  message: {
    message: 'Too many false report submissions from this IP, please try again after 1 hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use a custom key generator to combine IP and user ID for better isolation
  keyGenerator: (req) => {
    // If user is authenticated, use IP + user ID for more precise limiting
    if (req.user && req.user.id) {
      return `${req.ip}_user_${req.user.id}`;
    }
    // Fallback to IP only for unauthenticated requests
    return req.ip;
  },
});

// Rate limiter for password reset attempts
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset attempts per hour
  message: {
    message: 'Too many password reset attempts from this IP, please try again after 1 hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for profile updates
const profileUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 profile updates per 15 minutes
  message: {
    message: 'Too many profile update requests from this IP, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  generalLimiter,
  authLimiter,
  createContentLimiter,
  actionLimiter,
  falseReportLimiter,
  passwordResetLimiter,
  profileUpdateLimiter,
};