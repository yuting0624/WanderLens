'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Sparkles } from '@/components/ui/sparkles'
import { AnimatedText } from '@/components/ui/animated-text'
import Loader from '@/components/ui/loader'
import { useAuthStore } from '@/lib/store/auth'

export function AuthTransition() {
  const router = useRouter()
  const { state } = useAuthStore()

  useEffect(() => {
    // ユーザーが認証されていない場合は認証画面にリダイレクト
    if (!state.user) {
      router.push('/auth')
      return
    }

    // 3秒後にチャット画面に遷移
    const timer = setTimeout(() => {
      router.push('/chat')
    }, 3000)

    return () => clearTimeout(timer)
  }, [router, state.user])

  // ユーザーが認証されていない場合は何も表示しない
  if (!state.user) return null

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <Sparkles color="#88ccff" className="mb-6">
          <AnimatedText
            text="WanderLens"
            className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 text-transparent bg-clip-text"
          />
        </Sparkles>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8 relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 blur-3xl rounded-full transform -translate-y-8" />
          <Loader />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 space-y-2"
        >
          <p className="text-lg text-blue-300">認証が完了しました</p>
          <p className="text-sm text-blue-200/60">
            WanderLensへようこそ
            <span className="inline-block ml-2 animate-pulse">✨</span>
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
} 