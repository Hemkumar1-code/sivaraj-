import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { db } from './firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

import { registerPlugin, Capacitor } from '@capacitor/core';
const BackgroundGeolocation = registerPlugin('BackgroundGeolocation');

const Track = () => {
    const [searchParams] = useSearchParams();
    const userId = searchParams.get('userId') || 'unknown';
    const [logs, setLogs] = useState('Waiting for GPS fix...');
    const [isTracking, setIsTracking] = useState(true);
    const [socket, setSocket] = useState(null);
    useEffect(() => {
        let wakeLock = null;
        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator) {
                    wakeLock = await navigator.wakeLock.request('screen');
                    console.log('Screen Wake Lock acquired');
                }
            } catch (err) {
                console.error(`Wake Lock error: ${err.message}`);
            }
        };

        if (isTracking) {
            requestWakeLock();
        }

        return () => {
            if (wakeLock !== null) {
                wakeLock.release().then(() => console.log('Screen Wake Lock released'));
            }
        };
    }, [isTracking]);

    useEffect(() => {
        if (!isTracking) return;
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const s = io(API_URL);
        setSocket(s);

        let watchId = null;
        let bgWatcherId = null;

        const handleLocationUpdate = async (latitude, longitude) => {
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
        };

        if (Capacitor.isNativePlatform()) {
            import('@capacitor/geolocation').then(({ Geolocation }) => {
                const initBackgroundWatcher = () => {
                    BackgroundGeolocation.addWatcher({
                        backgroundMessage: "Your live location is being shared safely.",
                        backgroundTitle: "Live Tracking Active",
                        requestPermissions: true,
                        stale: true,
                        distanceFilter: 0
                    }, (location, error) => {
                        if (error) {
                            console.error("Background Geo Error:", error);
                            if (error.code === "NOT_AUTHORIZED") {
                                setLogs("Background Location Denied.\n\nPlease go to:\nSettings -> Apps -> Your App -> Permissions -> Location\nSelect 'Allow all the time'.");
                            } else {
                                setLogs(`Background Geo Error: ${error.message || error.code}`);
                            }
                            return;
                        }
                        if (location && location.latitude) {
                            handleLocationUpdate(location.latitude, location.longitude);
                        }
                    }).then((id) => {
                        bgWatcherId = id;
                        setLogs("Background tracking started successfully.");
                    }).catch(err => {
                        console.error("Error starting background watcher", err);
                        setLogs("Failed to initialize background tracking.");
                    });
                };

                initBackgroundWatcher();
            });

        } else if (navigator.geolocation) {
            // Fallback for Web Browser
            watchId = navigator.geolocation.watchPosition(
                (position) => handleLocationUpdate(position.coords.latitude, position.coords.longitude),
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
            if (bgWatcherId !== null) {
                BackgroundGeolocation.removeWatcher({ id: bgWatcherId });
            }
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
                    ? 'Your location is being shared with the Admin se  curely.'
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
