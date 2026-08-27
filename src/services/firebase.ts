import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import firebaseConfigData from '../../firebase-applet-config.json';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

try {
  if (firebaseConfigData && firebaseConfigData.projectId) {
    if (!getApps().length) {
      app = initializeApp(firebaseConfigData);
    } else {
      app = getApp();
    }
    db = getFirestore(app);
  }
} catch (error) {
  console.warn('Firebase initialization note (running in local/offline fallback mode):', error);
}

export { app, db };
