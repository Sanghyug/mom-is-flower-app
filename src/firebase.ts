import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAjciDML9XEB8jZlC1kG6MGpxlXtHdeFKY",
  authDomain: "mom-is-flower.firebaseapp.com",
  projectId: "mom-is-flower",
  storageBucket: "mom-is-flower.firebasestorage.app",
  messagingSenderId: "212958395926",
  appId: "1:212958395926:web:4987d187e201c9de673f37",
  measurementId: "G-JD4WHNS6F4",
};

const app = initializeApp(firebaseConfig);

export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);

export async function ensureAnonymousLogin() {
  if (auth.currentUser) return auth.currentUser;

  const result = await signInAnonymously(auth);
  return result.user;
}

export default app;
