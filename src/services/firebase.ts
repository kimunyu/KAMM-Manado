import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForStudio919304e3",
  projectId: "ai-studio-mediatorkontrakm-919304e3-4fb7-4025-a4e8-2c90f5b0fe3e",
  appId: "919304e3-4fb7-4025-a4e8-2c90f5b0fe3e",
  authDomain: "ai-studio-mediatorkontrakm-919304e3-4fb7-4025-a4e8-2c90f5b0fe3e.firebaseapp.com",
};


export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
});

export const auth = getAuth(app);
export const firebaseConfigData = firebaseConfig;
