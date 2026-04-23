import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth"; // ✨ NEW: Auth module

const firebaseConfig = {
  apiKey: "AIzaSyDM-73X_HNsZhl7NcU4DeRa4W6SZKL8kkw",
  authDomain: "projectx-data.firebaseapp.com",
  databaseURL: "https://projectx-data-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "projectx-data",
  storageBucket: "projectx-data.appspot.com",
  messagingSenderId: "1094663255441",
  appId: "1:1094663255441:web:4b2e2222ca4bb797951630",
  measurementId: "G-K4WEGMTDS3"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app); // ✨ NEW: Export auth for App.jsx