import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyClJxjKmMbQTtYnaNSQYGPWfNapOWNhQpA",
  authDomain: "warsha-360.firebaseapp.com",
  projectId: "warsha-360",
  storageBucket: "warsha-360.firebasestorage.app",
  messagingSenderId: "199246041049",
  appId: "1:199246041049:web:ba74a7b00fe04cbaed53c8",
  measurementId: "G-0F76R79ZHD"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Firebase Analytics (only in browser environment)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
