import { auth } from './firebase'
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth'

export interface AuthState {
  user: User | null
  loading: boolean
  error: Error | null
}

// 認証状態の変更を監視するリスナーを設定
export function subscribeToAuthState(callback: (state: AuthState) => void): () => void {
  return onAuthStateChanged(
    auth,
    (user) => {
      callback({
        user,
        loading: false,
        error: null
      })
    },
    (error) => {
      callback({
        user: null,
        loading: false,
        error: error as Error
      })
    }
  )
}

// Googleでサインイン
export async function signInWithGoogle(): Promise<User> {
  try {
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)
    return result.user
  } catch (error) {
    console.error('Googleサインインエラー:', error)
    throw error
  }
}

// サインアウト
export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(auth)
  } catch (error) {
    console.error('サインアウトエラー:', error)
    throw error
  }
} 