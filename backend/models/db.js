const mongoose = require('mongoose');
const dbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mydatabase';

const connectDB = async () => {
    try {
        await mongoose.connect(dbURI);
        console.log('Database connected successfully');
    }
    catch (error) {
        console.error('Database connection failed:');
        process.exit(0);
    }
}

module.exports = connectDB;