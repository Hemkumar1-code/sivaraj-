const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trackr';
        await mongoose.connect(uri);
        console.log('Connected to MongoDB database.');
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
