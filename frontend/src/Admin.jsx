import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { io } from 'socket.io-client';
import 'leaflet/dist/leaflet.css';

// Fix typical Leaflet icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const carIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3204/3204098.png',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
});

// Since the dev server is likely running on a different port than the node API
const socket = io('https://huge-stars-divide.loca.lt');

const Admin = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const mapRef = useRef(null);

    useEffect(() => {
        if (localStorage.getItem('role') !== 'admin') {
            navigate('/');
            return;
        }

        socket.emit('admin_join');

        socket.on('initial_locations', (usersArray) => {
            setUsers(usersArray);
        });

        socket.on('user_location_update', (userData) => {
            setUsers(prev => {
                const existingInfo = prev.find(u => u.userId === userData.userId);
                if (existingInfo) {
                    return prev.map(u => u.userId === userData.userId ? userData : u);
                }
                return [...prev, userData];
            });
        });

        return () => {
            socket.off('initial_locations');
            socket.off('user_location_update');
        };
    }, [navigate]);

    const focusUser = (lat, lng) => {
        if (mapRef.current) {
            mapRef.current.flyTo([lat, lng], 17);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        socket.disconnect();
        navigate('/');
    };

    return (
        <div className="dashboard glass-panel" style={{ padding: '1rem' }}>
            <div className="header">
                <h1 style={{ color: 'var(--primary)' }}>Admin Live Tracking</h1>
                <button className="btn" style={{ width: 'auto' }} onClick={handleLogout}>Log Out</button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', height: 'calc(100% - 60px)' }}>
                <div style={{
                    width: '300px',
                    background: 'rgba(30, 41, 59, 0.5)',
                    borderRadius: '12px',
                    padding: '1rem',
                    border: '1px solid var(--border)',
                    overflowY: 'auto'
                }}>
                    <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--text-main)' }}>Active Users</h2>
                    <div>
                        {users.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No active drivers.</p>
                        ) : (
                            users.map(data => (
                                <div key={data.userId} className="user-card">
                                    <h3>{data.userId}</h3>
                                    <div className="tracker-status" style={{ marginTop: '5px', justifyContent: 'flex-start' }}>
                                        <div className="status-indicator active"></div>Live
                                    </div>
                                    <div className="distance-display" style={{ fontSize: '2rem' }}>
                                        {data.distance ? data.distance.toFixed(3) : "0.000"} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>km</span>
                                    </div>
                                    <p>Lat: {data.lat.toFixed(5)}</p>
                                    <p>Lng: {data.lng.toFixed(5)}</p>
                                    <button
                                        className="btn"
                                        style={{ marginTop: '10px', padding: '0.5rem' }}
                                        onClick={() => focusUser(data.lat, data.lng)}
                                    >
                                        View on Map
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="map-container">
                    <MapContainer
                        center={[13.0827, 80.2707]} // Default to Chennai
                        zoom={12}
                        scrollWheelZoom={true}
                        ref={mapRef}
                        style={{ height: '100%', width: '100%' }}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>, <a href="https://carto.com/attributions">CARTO</a>'
                            url='https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                            subdomains='abcd'
                            maxZoom={20}
                        />
                        {users.map(data => (
                            <Marker
                                key={data.userId}
                                position={[data.lat, data.lng]}
                                icon={carIcon}
                            >
                                <Popup>
                                    <b>User:</b> {data.userId}<br />
                                    <b>Distance:</b> {data.distance ? data.distance.toFixed(2) : 0} km
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>
            </div>
        </div>
    );
};

export default Admin;
