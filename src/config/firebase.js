// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {getAuth,GoogleAuthProvider} from 'firebase/auth';
import {getFirestore} from 'firebase/firestore';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCQ6rY2mBv70tAJM0Kya3K4vaeyWWCSUsY",
  authDomain: "trial-5a2ce.firebaseapp.com",
  projectId: "trial-5a2ce",
  storageBucket: "trial-5a2ce.firebasestorage.app",
  messagingSenderId: "295229771176",
  appId: "1:295229771176:web:567cab1082e9dd5bf1a19d",
  measurementId: "G-60VCE93PFZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export  const Auth=getAuth(app);
export const provider=new GoogleAuthProvider();
export const db=getFirestore(app);