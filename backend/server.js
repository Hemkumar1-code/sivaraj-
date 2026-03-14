const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const nodemailer = require('nodemailer');
const cors = require('cors');
const { connectDB, User, LocationHistory } = require('./db');
require('dotenv').config();


const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const activeUsers = new Map();
const socketToUser = new Map();
const EMAIL_USER = 'hemk3672@Gmail.com';
const EMAIL_PASS = 'xppewlvidigowitv';
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
    }
});
function generateMapHTML(history, userId) {
    if (!history || history.length === 0) return '<h1>No location history</h1>';

    const latlngs = history.map(p => `[${p.lat}, ${p.lng}]`).join(',\n            ');
    const startPoint = history[0];

    return `<!DOCTYPE html>
<html>
<head>
    <title>Route Map for ${userId}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        body { margin: 0; padding: 0; }
        #map { width: 100vw; height: 100vh; }
    </style>
</head>
<body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        var map = L.map('map').setView([${startPoint.lat}, ${startPoint.lng}], 15);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(map);

        var latlngs = [
            ${latlngs}
        ];

        var polyline = L.polyline(latlngs, {color: 'black', weight: 6, opacity: 0.8}).addTo(map);
        map.fitBounds(polyline.getBounds());

        var endPoint = latlngs[latlngs.length - 1];
        if (endPoint) {
            var bikeIcon = L.icon({
                iconUrl: 'https://cdn-icons-png.flaticon.com/512/1986/1986937.png', // Bike image
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            });
            L.marker(endPoint, {icon: bikeIcon}).bindPopup('Ride Finished Here!').addTo(map);
        }
    </script>
</body>
</html>`;
}
async function notifyAdminDistance(userId, distanceKm, history) {
    if (!EMAIL_USER || EMAIL_USER.includes('YOUR_GMAIL')) return;

    const mailOptions = {
        from: EMAIL_USER,
        to: EMAIL_USER, 
        subject: `📍 Trackr Alert: ${userId} has stopped sharing location`,
        html: `
            <h2>Tracking Report</h2>
            <p><strong>User:</strong> ${userId}</p>
            <p><strong>Total Distance Traveled:</strong> ${distanceKm.toFixed(3)} km</p>
            <p>Time of completion: ${new Date().toLocaleString()}</p>
            <p><em>Please download and open the attached 'route_map_${userId}.html' file to view the dark line route.</em></p>
        `,
        attachments: []
    };

    if (history && history.length > 0) {
        mailOptions.attachments.push({
            filename: `route_map_${userId}.html`,
            content: generateMapHTML(history, userId),
            contentType: 'text/html'
        });
    }

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent for ${userId} traveled ${distanceKm.toFixed(3)} km`);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    console.log(`Login attempt for: ${email}`);
    try {
        const user = await User.findOne({ username: email, password: password });
        if (!user) {
            console.log(`Login failed for: ${email}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        console.log(`Login successful for: ${email}`);
        res.json({ id: user._id, role: user.role, email: user.username });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});


app.post('/api/users', async (req, res) => {
    const { email, password, role } = req.body;
    try {
        const newUser = await User.create({ username: email, password, role });
        res.json({ id: newUser._id, email: newUser.username, role: newUser.role });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create user (might already exist)' });
    }
});
io.on('connection', (socket) => {
    console.log('A user connected: ' + socket.id);
    socket.on('admin_join', () => {
        socket.join('admins');
        console.log('Admin joined room');
        const usersArray = Array.from(activeUsers.values());
        socket.emit('initial_locations', usersArray);
    });
    socket.on('update_location', (data) => {
        const { userId, lat, lng, timestamp } = data;
        let userData = activeUsers.get(userId) || { userId, distance: 0, lat, lng, lastLat: null, lastLng: null, history: [] };
        socketToUser.set(socket.id, userId);
        if (userData.lastLat !== null && userData.lastLng !== null) {
            const distSq = calculateDistance(userData.lastLat, userData.lastLng, lat, lng);
            if (distSq > 0.01) {
                userData.distance += distSq;
                userData.lastLat = lat;
                userData.lastLng = lng;
            }
        } else {
            userData.lastLat = lat;
            userData.lastLng = lng;
        }

        userData.lat = lat;
        userData.lng = lng;
        userData.history.push({ lat, lng, time: timestamp });

        activeUsers.set(userId, userData);
        LocationHistory.create({ user_id: userId, lat, lng, timestamp }).catch(err => console.error("Error saving location:", err));
        io.to('admins').emit('user_location_update', userData);
    });
    socket.on('disconnect', () => {
        console.log('User disconnected: ' + socket.id);
        const userId = socketToUser.get(socket.id);
        if (userId) {
            const userData = activeUsers.get(userId);
            if (userData) {
                console.log(`Sending summary email for ${userId} with distance ${userData.distance} km`);
                notifyAdminDistance(userId, userData.distance, userData.history);
                activeUsers.delete(userId);
            }
            socketToUser.delete(socket.id);
            console.log(`Cleaned up user ${userId}`);
        }
    });
});
app.get('/', (req, res) => {
    res.send('Trackr Backend is Running Perfectly! 🚀');
});
const PORT = process.env.PORT || 3000;
console.log(`Starting server on port ${PORT}...`);

connectDB().then(() => {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server is successfully running on 0.0.0.0:${PORT}`);
    });
}).catch(err => {
    console.error('CRITICAL: Failed to start server due to DB connection error:', err);
});

