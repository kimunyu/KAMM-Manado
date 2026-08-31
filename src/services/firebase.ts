import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import firebaseConfigData from '../../firebase-applet-config.json';

export const REQUIRED_FIRESTORE_DATABASE_ID = 'ai-studio-mediatorkontrakm-919304e3-4fb7-4025-a4e8-2c90f5b0fe3e';
export const REQUIRED_FIREBASE_PROJECT_ID = 'kamm-manado';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

try {
  if (!firebaseConfigData || !firebaseConfigData.projectId) {
    throw new Error('Konfigurasi Firebase (projectId) tidak ditemukan pada firebase-applet-config.json');
  }

  const projectId = firebaseConfigData.projectId;
  const configDbId = (firebaseConfigData as any)?.firestoreDatabaseId;
  const authDomain = firebaseConfigData.authDomain;

  // Validasi ketat fail-fast: Database ID wajib ada dan tidak boleh '(default)'
  if (!configDbId) {
    throw new Error('Firestore database ID tidak ditemukan pada firebase-applet-config.json');
  }

  if (configDbId === '(default)') {
    throw new Error('Konfigurasi Firestore tidak boleh menggunakan database "(default)".');
  }

  if (configDbId !== REQUIRED_FIRESTORE_DATABASE_ID) {
    throw new Error(`Firestore database ID tidak cocok! Diharapkan "${REQUIRED_FIRESTORE_DATABASE_ID}", ditemukan "${configDbId}"`);
  }

  if (projectId !== REQUIRED_FIREBASE_PROJECT_ID) {
    throw new Error(`Firebase projectId tidak cocok! Diharapkan "${REQUIRED_FIREBASE_PROJECT_ID}", ditemukan "${projectId}"`);
  }

  // Diagnostic startup wajib
  console.log('[ FIRESTORE-CONFIG ]', {
    projectId,
    databaseId: configDbId,
    authDomain
  });

  if (!getApps().length) {
    app = initializeApp(firebaseConfigData);
  } else {
    app = getApp();
  }
  
  // Initialize Firebase Auth
  try {
    auth = getAuth(app);
  } catch (authErr: any) {
    console.error('Failed to initialize Firebase Auth:', authErr);
    throw authErr;
  }
  
  // Initialize Named Firestore Database (TIDAK ADA FALLBACK ke '(default)')
  try {
    db = getFirestore(app, configDbId);
  } catch (dbErr: any) {
    console.error('[ FIRESTORE-CONFIG-ERROR ]', {
      projectId,
      databaseId: configDbId,
      errorCode: dbErr?.code || 'INIT_FAILED',
      errorMessage: dbErr?.message || String(dbErr)
    });
    db = null;
    throw dbErr;
  }
} catch (error: any) {
  console.error('[ FIRESTORE-CONFIG-ERROR ]', {
    projectId: firebaseConfigData?.projectId || 'UNKNOWN',
    databaseId: (firebaseConfigData as any)?.firestoreDatabaseId || 'UNKNOWN',
    errorCode: error?.code || 'CONFIG_FATAL',
    errorMessage: error?.message || String(error)
  });
  throw error;
}

export { app, db, auth, firebaseConfigData };


