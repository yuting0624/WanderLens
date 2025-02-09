'use client'

import { motion } from 'framer-motion'
import { SessionReport } from '@/lib/types/multimodal'
import { cn } from '@/lib/utils'

interface SessionReportCardProps {
  report: SessionReport
}

export function SessionReportCard({ report }: SessionReportCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "w-full",
        "bg-gray-900/90 backdrop-blur-lg",
        "rounded-2xl shadow-xl",
        "p-6 space-y-6",
        "border border-white/10"
      )}
    >
      {/* ヘッダー */}
      <div className="space-y-2">
        <h3 className="text-xl sm:text-2xl font-bold text-white/90 flex items-center gap-2">
          <span className="inline-block w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            📊
          </span>
          Session Report
        </h3>
        <p className="text-sm text-white/60">
          {new Date(report.timestamp).toLocaleString()}
        </p>
      </div>

      <div className="space-y-6">
        {/* 主な興味・関心事 */}
        <div className="space-y-3">
          <h4 className="text-lg font-semibold text-white/90 flex items-center gap-2">
            <span className="inline-block w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center text-sm">
              🎯
            </span>
            主な興味・関心事
          </h4>
          <ul className="grid gap-2">
            {report.insights.map((insight, index) => (
              <li key={index} className="flex items-start gap-2 text-white/80">
                <span className="text-blue-400">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* おすすめスポット */}
        <div className="space-y-3">
          <h4 className="text-lg font-semibold text-white/90 flex items-center gap-2">
            <span className="inline-block w-6 h-6 rounded-lg bg-yellow-500/20 flex items-center justify-center text-sm">
              ✨
            </span>
            おすすめスポット
          </h4>
          <ul className="grid gap-2">
            {report.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-2 text-white/80">
                <span className="text-yellow-400">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 旅行のアドバイス */}
        <div className="space-y-3">
          <h4 className="text-lg font-semibold text-white/90 flex items-center gap-2">
            <span className="inline-block w-6 h-6 rounded-lg bg-green-500/20 flex items-center justify-center text-sm">
              💡
            </span>
            アドバイス
          </h4>
          <ul className="grid gap-2">
            {report.advice.map((adv, index) => (
              <li key={index} className="flex items-start gap-2 text-white/80">
                <span className="text-green-400">•</span>
                <span>{adv}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  )
} 