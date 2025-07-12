// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCYztJsDBVoD4dxr381ScszSBwwDFDAG7c",
  authDomain: "dcphlogs.firebaseapp.com",
  projectId: "dcphlogs",
  storageBucket: "dcphlogs.firebasestorage.app",
  messagingSenderId: "79134966025",
  appId: "1:79134966025:web:e848fa2bf6e44ca93593d8",
  measurementId: "G-EXKF0XXR49"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize Analytics only on client side
let analytics = null;
if (typeof window !== 'undefined') {
  import('firebase/analytics').then(({ getAnalytics }) => {
    analytics = getAnalytics(app);
  });
}

export { app, auth, db, analytics };