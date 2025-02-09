'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '@/lib/utils/firebase'
import { FcGoogle } from 'react-icons/fc'
import { Sparkles } from '@/components/ui/sparkles'
import { AnimatedText } from '@/components/ui/animated-text'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        await createUserWithEmailAndPassword(auth, email, password)
      }
      router.push('/auth/transition')
    } catch (err: any) {
      const errorCode = err.code
      switch (errorCode) {
        case 'auth/email-already-in-use':
          setError('このメールアドレスは既に使用されています')
          break
        case 'auth/invalid-email':
          setError('メールアドレスの形式が正しくありません')
          break
        case 'auth/operation-not-allowed':
          setError('この認証方法は現在利用できません')
          break
        case 'auth/weak-password':
          setError('パスワードは6文字以上で設定してください')
          break
        case 'auth/user-disabled':
          setError('このアカウントは無効になっています')
          break
        case 'auth/user-not-found':
          setError('アカウントが見つかりません')
          break
        case 'auth/wrong-password':
          setError('パスワードが間違っています')
          break
        default:
          setError('認証エラーが発生しました。しばらく経ってからお試しください')
      }
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
      router.push('/auth/transition')
    } catch (err: any) {
      setError('Googleログインに失敗しました。しばらく経ってからお試しください')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 backdrop-blur-[1px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-75"></div>
          <div className="relative bg-gray-900 rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <Sparkles color="#88ccff">
                <AnimatedText
                  text="WanderLens"
                  className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-indigo-400"
                />
              </Sparkles>
              <p className="text-blue-200">
                {isLogin ? 'ログインして旅を始めましょう' : '新規登録して旅を始めましょう'}
              </p>
            </div>

            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-2 bg-gray-800 text-white font-semibold py-3 px-4 rounded-xl border border-gray-700 hover:bg-gray-700 transition duration-200 ease-in-out mb-6 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <FcGoogle className="text-xl" />
              <span>Googleで{isLogin ? 'ログイン' : '新規登録'}</span>
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-900 text-gray-400">または</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  パスワード
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                  required
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                className="w-full relative group overflow-hidden rounded-xl"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl blur opacity-75"></div>
                <span className="relative block px-8 py-3 bg-gray-900 rounded-xl text-white font-semibold group-hover:bg-gray-800 transition duration-200">
                  {isLogin ? 'ログイン' : '新規登録'}
                </span>
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-blue-400 hover:text-blue-300 text-sm font-medium transition duration-200"
              >
                {isLogin ? '新規登録はこちら' : 'ログインはこちら'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
} 