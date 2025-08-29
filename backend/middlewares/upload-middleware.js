const multer = require('multer');
const path = require('path');

// Configure multer for memory storage (we'll upload directly to Cloudinary)
const storage = multer.memoryStorage();

// File filter function to validate file types
const fileFilter = (req, file, cb) => {
    // Check if the file is an image
    if (file.mimetype.startsWith('image/')) {
        // Allow common image formats
        const allowedMimeTypes = [
            'image/jpeg',
            'image/jpg', 
            'image/png',
            'image/gif',
            'image/webp'
        ];
        
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, GIF and WebP image formats are allowed'), false);
        }
    } else {
        cb(new Error('Only image files are allowed'), false);
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1 // Only allow one file
    }
});

// Middleware for single profile picture upload
const uploadProfilePicture = upload.single('profilePicture');

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        switch (err.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({ 
                    message: 'File too large. Maximum size allowed is 5MB.' 
                });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({ 
                    message: 'Too many files. Only one file is allowed.' 
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({ 
                    message: 'Unexpected file field. Use "profilePicture" as field name.' 
                });
            default:
                return res.status(400).json({ 
                    message: 'File upload error: ' + err.message 
                });
        }
    } else if (err) {
        // Custom validation errors
        return res.status(400).json({ 
            message: err.message 
        });
    }
    next();
};

module.exports = {
    uploadProfilePicture,
    handleMulterError
};