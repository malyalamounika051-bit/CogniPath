import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBwqlEn2dkaQ5CkDYFfIPrTWVOJn1jotjU",
  authDomain: "cognipath-0000.firebaseapp.com",
  projectId: "cognipath-0000",
  storageBucket: "cognipath-0000.firebasestorage.app",
  messagingSenderId: "492682779809",
  appId: "1:492682779809:web:da22cffd1d90c65d96e4e0",
  measurementId: "G-0PYZKSNZ0K"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
};
export default app;
