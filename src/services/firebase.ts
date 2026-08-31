import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import firebaseConfigData from '../../firebase-applet-config.json';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

try {
  if (firebaseConfigData && firebaseConfigData.projectId) {
    console.log("[AUTH-CONFIG]", {
      projectId: firebaseConfigData.projectId,
      authDomain: firebaseConfigData.authDomain
    });

    if (!getApps().length) {
      app = initializeApp(firebaseConfigData);
    } else {
      app = getApp();
    }
    
    // Initialize Firebase Auth
    try {
      auth = getAuth(app);
    } catch (authErr) {
      console.warn('Failed to initialize Firebase Auth:', authErr);
    }
    
    // Check if a specific firestoreDatabaseId is provided in configuration
    const configDbId = (firebaseConfigData as any)?.firestoreDatabaseId;
    if (configDbId && configDbId !== '(default)') {
      try {
        db = getFirestore(app, configDbId);
      } catch (dbErr) {
        console.warn(`Failed to connect to custom firestore database "${configDbId}", falling back to default:`, dbErr);
        db = getFirestore(app);
      }
    } else {
      db = getFirestore(app);
    }
  }
} catch (error) {
  console.warn('Firebase initialization note (running in local/offline fallback mode):', error);
}

export { app, db, auth, firebaseConfigData };

