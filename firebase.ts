import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyAxZIXZ9Y4mLq7fSHwexUyG5YIV5z6aTyc",
  authDomain: "fir-db-project-496801.firebaseapp.com",
  databaseURL: "https://firebase-db-project-496801-default-rtdb.firebaseio.com",
  projectId: "firebase-db-project-496801",
  storageBucket: "firebase-db-project-496801.firebasestorage.app",
  messagingSenderId: "725601268906",
  appId: "1:725601268906:web:e66a9dab2c660c8c254cd3",
  measurementId: "G-3R8PNPT6QJ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
