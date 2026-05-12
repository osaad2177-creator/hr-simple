// src/services/firebase.js
// Replace the firebaseConfig object with your actual Firebase project credentials
// from: https://console.firebase.google.com → Project Settings → Your Apps

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyBOOkas_BRTSymRo1ASS7vERZn7CwTtJPI",
  authDomain: "smart-hr-attendance-af284.firebaseapp.com",
  projectId: "smart-hr-attendance-af284",
  storageBucket: "smart-hr-attendance-af284.firebasestorage.app",
  messagingSenderId: "659674955874",
  appId: "1:659674955874:web:f0bcf3c6c0651d1b46513b"
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
