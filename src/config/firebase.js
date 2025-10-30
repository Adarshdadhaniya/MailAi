import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCQ6rY2mBv70tAJM0Kya3K4vaeyWWCSUsY",
  authDomain: "trial-5a2ce.firebaseapp.com",
  projectId: "trial-5a2ce",
  storageBucket: "trial-5a2ce.firebasestorage.app",
  messagingSenderId: "295229771176",
  appId: "1:295229771176:web:567cab1082e9dd5bf1a19d",
  measurementId: "G-60VCE93PFZ",
};

const app = initializeApp(firebaseConfig);

export const Auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
