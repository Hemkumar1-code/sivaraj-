import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';

const User = () => {
    const navigate = useNavigate();
    const [scanResult, setScanResult] = useState('');

    useEffect(() => {
        if (localStorage.getItem('role') !== 'user') {
            navigate('/');
            return;
        }

        const scanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            false
        );

        scanner.render(
            (decodedText, decodedResult) => {
                setScanResult("QR Code Scanned Successfully!");
                scanner.clear();
                const userId = localStorage.getItem('userId') || 'sivaraj_1';
                navigate(`/track?userId=${userId}`);
            },
            (error) => {
            }
        );

        return () => {
            scanner.clear().catch(error => {
                console.error("Failed to clear html5QrcodeScanner. ", error);
            });
        };
    }, [navigate]);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    return (
        <div className="glass-panel login-container" style={{ maxWidth: '500px' }}>
            <h1>Welcome, Sivaraj</h1>
            <p>Scan a QR Code to start sharing your live location with the Admin</p>

            <div className="qr-container" style={{ width: '100%', maxWidth: '300px', margin: '0 auto', overflow: 'hidden', borderRadius: '12px', background: 'white' }}>
                <div id="reader" style={{ width: '100%' }}></div>
                {scanResult && <div style={{ marginTop: '1rem', color: 'var(--accent)', fontWeight: 'bold' }}>{scanResult}</div>}
            </div>

            <div style={{ marginTop: '2rem' }}>
                <button
                    onClick={handleLogout}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                    }}
                >
                    Log Out
                </button>
            </div>
        </div>
    );
};

export default User;
