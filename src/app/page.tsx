'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Sparkles } from '@/components/ui/sparkles'
import { AnimatedText } from '@/components/ui/animated-text'
import { FiMap, FiGlobe, FiNavigation } from 'react-icons/fi'
import { FlipWords } from '@/components/ui/flip-words'

export default function Home() {
  const words = ["鮮やかに", "楽しく", "スマートに"];
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-16 sm:py-24">
        <div className="text-center relative z-10">
          <Sparkles color="#88ccff" className="mb-6">
            <AnimatedText
              text="WanderLens"
              className="text-5xl sm:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-indigo-400 text-transparent bg-clip-text"
            />
          </Sparkles>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl sm:text-2xl text-blue-200 mb-8 max-w-2xl mx-auto"
          >
            あなたの冒険を、もっと
            <FlipWords 
              words={words}
            />
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-gray-400 mb-12 max-w-3xl mx-auto"
          >
            カメラを通して街の魅力を発見し、
            <br />
            次世代の外出体験を提供します
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row justify-center items-center gap-6 mb-16"
        >
          <Link
            href="/auth"
            className="relative inline-flex group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl blur opacity-50 group-hover:opacity-75 transition duration-200"></div>
            <button className="relative px-8 py-4 bg-gray-900 rounded-xl leading-none flex items-center">
              <span className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                旅を始める
              </span>
            </button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto"
        >
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
            <div className="relative bg-gray-900 rounded-xl p-8 shadow-lg">
              <FiGlobe className="text-4xl text-blue-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-4">
                AIカメラガイド
              </h3>
              <p className="text-gray-400">
                カメラを向けるだけで建物や看板を認識。
                環境を詳しく解説します。
              </p>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
            <div className="relative bg-gray-900 rounded-xl p-8 shadow-lg">
              <FiMap className="text-4xl text-blue-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-4">
                スポット提案
              </h3>
              <p className="text-gray-400">
                あなたの好みに合わせて、
                周辺の魅力的なスポットをAIが提案。
              </p>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
            <div className="relative bg-gray-900 rounded-xl p-8 shadow-lg">
              <FiNavigation className="text-4xl text-blue-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-4">
                ナビゲーション
              </h3>
              <p className="text-gray-400">
                目的地までの歩行ルートを案内。
                スポットを効率的に巡れます。
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
