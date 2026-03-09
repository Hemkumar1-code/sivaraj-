import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyADwZ5o4-Ac8ie34BOWQAQfaEUec5ltmVo",
    authDomain: "live-location-tracker-9ad1c.firebaseapp.com",
    projectId: "live-location-tracker-9ad1c",
    storageBucket: "live-location-tracker-9ad1c.firebasestorage.app",
    messagingSenderId: "1024446155443",
    appId: "1:1024446155443:web:1c615b25124ae499ec7ec6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
