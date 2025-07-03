
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDIlqHcYPDkWZrQ13I7D4adfSe2qXkHRYw",
  authDomain: "prepwise-2e04b.firebaseapp.com",
  projectId: "prepwise-2e04b",
  storageBucket: "prepwise-2e04b.firebasestorage.app",
  messagingSenderId: "5406518603",
  appId: "1:5406518603:web:0183cc21ed47fb003c4cce",
  measurementId: "G-E3JC7BKM40"
};

// Initialize Firebase
const app = !getApps.length ? initializeApp(firebaseConfig): getApp();

export const auth = getAuth(app);
export const db = getFirestore(app)