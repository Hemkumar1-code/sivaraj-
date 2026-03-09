const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');

        // Create Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT
        )`, (err) => {
            if (err) console.error('Error creating users table', err);
            else {
                // Initialize default users if empty
                db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
                    if (row && row.count === 0) {
                        db.run("INSERT INTO users (username, password, role) VALUES ('hemk3672@gmail.com', 'HEMkumar33#', 'admin')");
                        db.run("INSERT INTO users (username, password, role) VALUES ('sivaraj@gmail.com', 'Sivaraj33#', 'user')");
                    }
                });
            }
        });

        // Create Location History table
        db.run(`CREATE TABLE IF NOT EXISTS location_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            lat REAL,
            lng REAL,
            timestamp TEXT
        )`, (err) => {
            if (err) console.error('Error creating location_history table', err);
        });
    }
});

module.exports = db;
