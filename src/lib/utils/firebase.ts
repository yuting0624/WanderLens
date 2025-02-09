import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getAuth, connectAuthEmulator, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

console.log('Initializing Firebase with config:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  environment: process.env.NODE_ENV
})

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const auth = getAuth(app)
const db = getFirestore(app)
const googleProvider = new GoogleAuthProvider()

// 開発環境の場合のみエミュレータに接続
if (process.env.NODE_ENV === 'development') {
  if (process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST) {
    console.log('Using Firestore Emulator')
    const [host, port] = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST.split(':')
    connectFirestoreEmulator(db, host, parseInt(port))
  }

  if (process.env.NEXT_PUBLIC_AUTH_EMULATOR_HOST) {
    console.log('Using Auth Emulator')
    const [authHost, authPort] = process.env.NEXT_PUBLIC_AUTH_EMULATOR_HOST.split(':')
    connectAuthEmulator(auth, `http://${authHost}:${authPort}`)
  }
} else {
}

// Google認証の設定
googleProvider.setCustomParameters({
  prompt: 'select_account'
})

export { app as firebaseApp, db, auth, googleProvider } 