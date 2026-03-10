const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // You will need to put your MongoDB Atlas Connection String here or in a .env file!
        // Example: mongodb+srv://username:password@cluster.mongodb.net/trackr
        const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trackr';
        await mongoose.connect(uri);
        console.log('Connected to MongoDB database.');

        // Initialize default users if db is empty
        const count = await User.countDocuments();
        if (count === 0) {
            await User.create([
                { username: 'hemk3672@gmail.com', password: 'HEMkumar33#', role: 'admin' },
                { username: 'sivaraj@gmail.com', password: 'Sivaraj33#', role: 'user' }
            ]);
            console.log('Default users created in MongoDB.');
        }

    } catch (err) {
        console.error('Error connecting to MongoDB', err);
        process.exit(1);
    }
};

// Define Models
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

const locationHistorySchema = new mongoose.Schema({
    user_id: String,
    lat: Number,
    lng: Number,
    timestamp: String
});

const LocationHistory = mongoose.model('LocationHistory', locationHistorySchema);

module.exports = { connectDB, User, LocationHistory };
