import { create } from 'zustand'
import { type AuthState } from '../utils/auth'
import { subscribeToAuthState, signInWithGoogle, signOut } from '../utils/auth'

interface AuthStore {
  state: AuthState
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const initialState: AuthState = {
  user: null,
  loading: true,
  error: null
}

export const useAuthStore = create<AuthStore>((set) => {
  // 認証状態の変更を監視
  subscribeToAuthState((state) => {
    set({ state })
  })

  return {
    state: initialState,
    signIn: async () => {
      try {
        set((state) => ({
          state: { ...state.state, loading: true, error: null }
        }))
        await signInWithGoogle()
      } catch (error) {
        set((state) => ({
          state: {
            ...state.state,
            loading: false,
            error: error as Error
          }
        }))
        throw error
      }
    },
    signOut: async () => {
      try {
        set((state) => ({
          state: { ...state.state, loading: true, error: null }
        }))
        await signOut()
      } catch (error) {
        set((state) => ({
          state: {
            ...state.state,
            loading: false,
            error: error as Error
          }
        }))
        throw error
      }
    }
  }
}) 