import { initializeApp } from "firebase/app";
import { 
  getFirestore, doc, setDoc, getDoc, onSnapshot, updateDoc, collection, runTransaction
 } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAgH7ev6NOSWUbkQuft1IvphrcJyxnK_jQ",
  authDomain: "maze-game-5ffea.firebaseapp.com",
  projectId: "maze-game-5ffea",
  storageBucket: "maze-game-5ffea.firebasestorage.app",
  messagingSenderId: "37452538680",
  appId: "1:37452538680:web:b2ae03e1395796bdcf57cd"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, doc, setDoc, getDoc, onSnapshot, updateDoc, collection, runTransaction };