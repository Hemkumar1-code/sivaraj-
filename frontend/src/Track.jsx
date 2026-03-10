import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { db } from './firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

const Track = () => {
    const [searchParams] = useSearchParams();
    const userId = searchParams.get('userId') || 'unknown';
    const [logs, setLogs] = useState('Waiting for GPS fix...');
    const [isTracking, setIsTracking] = useState(true);
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        if (!isTracking) return;
        const s = io('https://location-2-okrw.onrender.com');
        setSocket(s);

        let watchId = null;

        if (navigator.geolocation) {
            watchId = navigator.geolocation.watchPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    const timestamp = new Date().toISOString();

                    s.emit('update_location', {
                        userId: userId,
                        lat: latitude,
                        lng: longitude,
                        timestamp: timestamp
                    });
                    if (userId !== 'unknown') {
                        try {
                            await setDoc(doc(db, "active_users", userId), {
                                userId: userId,
                                lat: latitude,
                                lng: longitude,
                                timestamp: timestamp
                            }, { merge: true });
                        } catch (error) {
                            console.error("Firebase update error", error);
                        }
                    }

                    setLogs(`Lat: ${latitude.toFixed(5)} \nLng: ${longitude.toFixed(5)} \nUpdated: ${new Date().toLocaleTimeString()}`);
                },
                (error) => {
                    console.error("Error getting location", error);
                    setLogs('Error accessing GPS. Please enable location permissions.');
                    setIsTracking(false);
                },
                { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
            );
        } else {
            setLogs("Geolocation is not supported by this browser.");
            setIsTracking(false);
        }

        return () => {
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
            s.disconnect();
        };
    }, [userId, isTracking]);

    const stopTracking = async () => {
        setIsTracking(false);
        if (socket) {
            socket.disconnect();
        }
        if (userId !== 'unknown') {
            try { await deleteDoc(doc(db, "active_users", userId)); } catch (e) { console.error(e); }
        }
        setLogs("Location sharing has been stopped.");
    };

    return (
        <div className="glass-panel" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <h1>{isTracking ? 'Live Tracking Active' : 'Tracking Stopped'}</h1>
            <p>
                {isTracking
                    ? 'Your location is being shared with the Admin securely.'
                    : 'You are no longer sharing your location.'}
            </p>

            <div className="tracker-status">
                <div
                    className={`status-indicator ${isTracking && !logs.includes('Error') ? 'active' : ''}`}
                    style={{
                        background: isTracking && !logs.includes('Error')
                            ? 'var(--accent)'
                            : 'var(--danger)'
                    }}
                ></div>
                <span
                    style={{
                        color: isTracking && !logs.includes('Error')
                            ? 'var(--accent)'
                            : 'var(--danger)',
                        fontWeight: 'bold'
                    }}
                >
                    {isTracking && !logs.includes('Error') ? 'Transmitting...' : 'Stopped / Error'}
                </span>
            </div>

            <div style={{ marginTop: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem', whiteSpace: 'pre-line' }}>
                {logs}
            </div>

            {isTracking && (
                <button
                    onClick={stopTracking}
                    className="btn"
                    style={{ background: 'var(--danger)', marginTop: '2rem' }}
                >
                    Stop Sharing Location
                </button>
            )}
        </div>
    );
};

export default Track;
