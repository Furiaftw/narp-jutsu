import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCLBEWiRq9RPR8u_NkptLpj2Y8ybOHljHw",
  authDomain: "narp-jutsu-db.firebaseapp.com",
  projectId: "narp-jutsu-db",
  storageBucket: "narp-jutsu-db.firebasestorage.app",
  messagingSenderId: "294205399255",
  appId: "1:294205399255:web:5c3d0f55485db6428d1092"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  onSnapshot,
  serverTimestamp
};
