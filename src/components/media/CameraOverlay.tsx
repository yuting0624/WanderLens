'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { type MultimodalMessage } from '@/lib/types/multimodal'
import { Navigation, Clock, MapPin, Star, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { SessionReportCard } from '../reports/SessionReportCard'
import { useMultimodalStore } from '@/lib/store/multimodal'

const DynamicMap = dynamic(() => import('@/components/DirectionsMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[200px] bg-black/40 backdrop-blur-md rounded-xl flex items-center justify-center">
      <div className="text-white/60">地図を読み込み中...</div>
    </div>
  ),
})

interface CameraOverlayProps {
  message: MultimodalMessage | null
  isVisible?: boolean
  onClose?: () => void
}

export function CameraOverlay({ message, isVisible = true, onClose }: CameraOverlayProps) {
  const { state, clearSessionReport } = useMultimodalStore()

  if (!message && !state.sessionReport) return null

  const renderCloseButton = () => (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute top-4 right-4 z-50"
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white border border-white/10 w-8 h-8"
      >
        <X className="w-4 h-4" />
      </Button>
    </motion.div>
  )

  const renderRouteInfo = (route: any) => {
    if (!route) return null

    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="absolute top-safe-area left-4 right-4 mt-16"
      >
        <div className="space-y-4">
          <div className="bg-black/40 backdrop-blur-md rounded-2xl overflow-hidden shadow-lg relative">
            {onClose && renderCloseButton()}
            <div className="h-[200px] relative">
              <DynamicMap route={route} origin="" destination="" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent pb-4 pt-4">
                <div className="px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-white/90">{route.duration.text}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-400" />
                      <span className="text-sm text-white/90">{route.distance.text}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  const renderPlacesInfo = (places: any) => {
    if (!places) return null

    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="absolute top-safe-area left-4 right-4 mt-16"
      >
        <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 shadow-lg text-white/90 border border-white/10 relative">
          {onClose && renderCloseButton()}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white/90">
              検索結果
            </h2>
          </div>
          <div className="space-y-3">
            {places.slice(0, 3).map((place: any, index: number) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.02 }}
                className="bg-black/40 backdrop-blur-md rounded-xl overflow-hidden shadow-lg transition-colors duration-300 hover:bg-black/50"
              >
                <div className="flex">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 relative flex-shrink-0">
                    {place.photos?.[0] ? (
                      <img
                        src={`/api/places/photo?reference=${place.photos[0].photoReference}&maxwidth=400`}
                        alt={place.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-blue-500/20 flex items-center justify-center">
                        <MapPin className="w-8 h-8 text-blue-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 p-3 sm:p-4">
                    <h3 className="text-base sm:text-lg font-semibold text-white/90 truncate">{place.name}</h3>
                    <div className="mt-1.5 sm:mt-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
                      {place.rating && (
                        <div className="flex items-center gap-1 bg-black/20 rounded-full px-2 py-0.5">
                          <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400 fill-yellow-400" />
                          <span className="text-xs sm:text-sm font-medium text-white/90">{place.rating}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 bg-black/20 rounded-full px-2 py-0.5">
                        <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
                        <span className="text-xs sm:text-sm font-medium text-white/90">{Math.round(place.distance)}m</span>
                      </div>
                      {place.openNow !== undefined && (
                        <div className="flex items-center gap-1 bg-black/20 rounded-full px-2 py-0.5">
                          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400" />
                          <span className={cn(
                            "text-xs sm:text-sm font-medium",
                            place.openNow ? "text-green-400" : "text-red-400"
                          )}>
                            {place.openNow ? "営業中" : "営業時間外"}
                          </span>
                        </div>
                      )}
                    </div>
                    {place.address && (
                      <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-white/70 line-clamp-2">
                        {place.address}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-40 flex flex-col"
        >
          {/* セッションレポートの表示（カメラが有効な場合） */}
          {state.sessionReport && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            >
              <div className="relative w-full max-w-lg mx-auto">
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute -top-2 -right-2 z-10 p-2 rounded-full bg-gray-800/80 text-white/80 hover:bg-gray-700/80 transition-colors"
                  onClick={clearSessionReport}
                >
                  <X className="w-4 h-4" />
                </motion.button>
                <SessionReportCard report={state.sessionReport} />
              </div>
            </motion.div>
          )}

          {/* メッセージの表示 */}
          {message && (
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <div className="max-w-3xl mx-auto p-4">
                {message.role === 'route' && message.route && renderRouteInfo(message.route)}
                {message.role === 'places' && message.places && renderPlacesInfo(message.places)}
                {message.role === 'assistant' && message.content && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="absolute bottom-32 left-4 right-4"
                  >
                    <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 shadow-lg text-white/90 border border-white/10">
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
} 