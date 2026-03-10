import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { io } from 'socket.io-client';
import { db } from './firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
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
const socket = io('https://location-2-okrw.onrender.com');

const Admin = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState('user');
    const [createMsg, setCreateMsg] = useState('');
    const mapRef = useRef(null);


    useEffect(() => {
        if (localStorage.getItem('role') !== 'admin') {
            navigate('/');
            return;
        }

        socket.emit('admin_join');

        socket.on('initial_locations', (usersArray) => {
            setUsers(prev => {
                let merged = [...prev];
                usersArray.forEach(u => {
                    if (!merged.find(m => m.userId === u.userId)) merged.push(u);
                });
                return merged;
            });
        });

        const q = query(collection(db, "active_users"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fbUsers = [];
            snapshot.forEach(doc => fbUsers.push(doc.data()));
            setUsers(prev => {
                let merged = [...prev];
                fbUsers.forEach(fu => {
                    const idx = merged.findIndex(u => u.userId === fu.userId);
                    if (idx !== -1) merged[idx] = { ...merged[idx], ...fu };
                    else merged.push(fu);
                });
                // Clean up offline users deleted from FB
                merged = merged.filter(m => fbUsers.find(fu => fu.userId === m.userId) || m.distance);
                return merged;
            });
        });

        socket.on('user_location_update', (userData) => {
            setUsers(prev => {
                const existingIdx = prev.findIndex(u => u.userId === userData.userId);
                if (existingIdx !== -1) {
                    const updated = [...prev];
                    updated[existingIdx] = { ...updated[existingIdx], distance: userData.distance };
                    return updated;
                }
                return [...prev, userData];
            });
        });

        return () => {
            socket.off('initial_locations');
            socket.off('user_location_update');
            unsubscribe();
        };
    }, [navigate]);

    const focusUser = (lat, lng) => {
        if (mapRef.current) {
            mapRef.current.flyTo([lat, lng], 17);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('https://location-2-okrw.onrender.com/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newEmail, password: newPassword, role: newRole })
            });
            const data = await res.json();
            if (res.ok) {
                setCreateMsg('User created successfully!');
                setNewEmail(''); setNewPassword(''); setNewRole('user');
            } else {
                setCreateMsg(data.error || 'Failed to create user');
            }
        } catch (err) {
            setCreateMsg('Server error');
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

                {/* Create User/Admin Panel */}
                <div style={{
                    width: '300px',
                    background: 'rgba(30, 41, 59, 0.5)',
                    borderRadius: '12px',
                    padding: '1rem',
                    border: '1px solid var(--border)',
                    overflowY: 'auto'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2 style={{ fontSize: '1.2rem', color: 'var(--text-main)', margin: 0 }}>Manage Users</h2>
                        <button className="btn" style={{ padding: '0.4rem', fontSize: '0.8rem' }} onClick={() => setShowCreate(!showCreate)}>
                            {showCreate ? 'Close' : 'Create User'}
                        </button>
                    </div>

                    {showCreate && (
                        <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <input
                                type="email"
                                placeholder="Email"
                                value={newEmail} onChange={e => setNewEmail(e.target.value)}
                                required
                                style={{ padding: '0.5rem', borderRadius: '4px', border: 'none', background: '#334155', color: '#fff' }}
                            />
                            <input
                                type="password"
                                placeholder="Password"
                                value={newPassword} onChange={e => setNewPassword(e.target.value)}
                                required
                                style={{ padding: '0.5rem', borderRadius: '4px', border: 'none', background: '#334155', color: '#fff' }}
                            />
                            <select
                                value={newRole} onChange={e => setNewRole(e.target.value)}
                                style={{ padding: '0.5rem', borderRadius: '4px', border: 'none', background: '#334155', color: '#fff' }}
                            >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                            </select>
                            <button className="btn" type="submit" style={{ padding: '0.5rem' }}>Create</button>
                            {createMsg && <p style={{ fontSize: '0.8rem', color: createMsg.includes('error') || createMsg.includes('Failed') ? 'var(--danger)' : '#10b981', marginTop: '5px' }}>{createMsg}</p>}
                        </form>
                    )}
                </div>

                <div className="map-container" style={{ flex: 1 }}>
                    <MapContainer
                        center={[13.0827, 80.2707]} // Default to Chennai
                        zoom={12}
                        scrollWheelZoom={true}
                        ref={mapRef}
                        style={{ height: '100%', width: '100%' }}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                            maxZoom={19}
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
