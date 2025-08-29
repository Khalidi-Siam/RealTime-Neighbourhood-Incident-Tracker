const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload image to Cloudinary
 * @param {String} filePath - Path to the file to upload
 * @param {String} folder - Cloudinary folder name
 * @returns {Object} Upload result with url and public_id
 */
const uploadImage = async (filePath, folder = 'profile_pictures') => {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            folder: folder,
            resource_type: 'image',
            transformation: [
                { width: 500, height: 500, crop: 'fill', gravity: 'face' },
                { quality: 'auto', fetch_format: 'auto' }
            ]
        });
        
        return {
            url: result.secure_url,
            publicId: result.public_id
        };
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        throw new Error('Failed to upload image');
    }
};

/**
 * Delete image from Cloudinary
 * @param {String} publicId - Cloudinary public ID of the image to delete
 * @returns {Object} Deletion result
 */
const deleteImage = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        console.error('Error deleting from Cloudinary:', error);
        throw new Error('Failed to delete image');
    }
};

/**
 * Upload image from buffer (for multer memory storage)
 * @param {Buffer} buffer - Image buffer
 * @param {String} folder - Cloudinary folder name
 * @returns {Object} Upload result with url and public_id
 */
const uploadImageFromBuffer = async (buffer, folder = 'profile_pictures') => {
    try {
        return new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                {
                    folder: folder,
                    resource_type: 'image',
                    transformation: [
                        { width: 500, height: 500, crop: 'fill', gravity: 'face' },
                        { quality: 'auto', fetch_format: 'auto' }
                    ]
                },
                (error, result) => {
                    if (error) {
                        console.error('Error uploading to Cloudinary:', error);
                        reject(new Error('Failed to upload image'));
                    } else {
                        resolve({
                            url: result.secure_url,
                            publicId: result.public_id
                        });
                    }
                }
            ).end(buffer);
        });
    } catch (error) {
        console.error('Error uploading buffer to Cloudinary:', error);
        throw new Error('Failed to upload image');
    }
};

module.exports = {
    cloudinary,
    uploadImage,
    deleteImage,
    uploadImageFromBuffer
};