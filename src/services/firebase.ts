// Firebase app initialization and shared SDK singletons.
//
// Configuration is read from Next.js public environment variables so that no
// secrets are hard-coded. Create a `.env.local` file at the project root with
// the values from your Firebase project settings (see `.env.example`):
//
//   NEXT_PUBLIC_FIREBASE_API_KEY=...
//   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
//   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
//   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
//   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
//   NEXT_PUBLIC_FIREBASE_APP_ID=...
//
// The NEXT_PUBLIC_ prefix is required so these values are inlined into the
// client bundle by Next.js.

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

// Firebase *web* config values are public by design (they identify the
// project in the browser; security is enforced by Firestore rules + Auth).
// They are safe to commit, so we fall back to the project's literal values
// when env vars are absent — this lets the app deploy (e.g. on Vercel) with no
// environment configuration. Set NEXT_PUBLIC_FIREBASE_* to override.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyC4RPM9d5-EbzDS6aYru6XTIWSi7PVmB1k",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "walletquantso.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "walletquantso",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "walletquantso.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "314680714852",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:314680714852:web:90fe8b4373e3f720ca2171",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "G-TDBE7C2G3V",
};

// Reuse the existing app during hot-module reloads instead of re-initializing.
export const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

// Analytics only runs in the browser and only where the environment supports it
// (it throws during SSR / in Node). Initialize it lazily and defensively.
export function initAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!firebaseConfig.measurementId) return Promise.resolve(null);
  return isSupported().then((ok) => (ok ? getAnalytics(app) : null));
}
