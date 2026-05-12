// src/services/firebase.js
// Replace the firebaseConfig object with your actual Firebase project credentials
// from: https://console.firebase.google.com → Project Settings → Your Apps

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBOOkas_BRTSymRo1ASS7vERZn7CwTtJPI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "smart-hr-attendance-af284.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "smart-hr-attendance-af284",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "smart-hr-attendance-af284.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "659674955874",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:659674955874:web:f0bcf3c6c0651d1b46513b",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export let messaging = null;
isSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app);
  }
});

export default app;
