'use client'

import { Button } from '@/components/ui/button'
import { Camera, Mic, MessageCircle, CameraOff, MicOff } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ControlBarProps {
  isVideoEnabled: boolean
  isAudioEnabled: boolean
  isConnected: boolean
  onVideoToggle: () => void
  onAudioToggle: () => void
  onChatToggle: () => void
}

export function ControlBar({
  isVideoEnabled,
  isAudioEnabled,
  isConnected,
  onVideoToggle,
  onAudioToggle,
  onChatToggle
}: ControlBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-40 pb-safe-area"
    >
      <div className="flex items-center justify-center gap-4 p-4 bg-gradient-to-t from-black/80 to-transparent pt-8">
        <Button
          variant="ghost"
          size="lg"
          onClick={onVideoToggle}
          disabled={!isConnected}
          className={cn(
            "rounded-full bg-black/40 backdrop-blur-sm border border-white/10 transition-all duration-300",
            "hover:scale-105 active:scale-95",
            isVideoEnabled
              ? "text-white hover:text-white/80 hover:bg-white/20 hover:border-white/30"
              : "text-white/60 hover:text-white/80 hover:bg-white/20 hover:border-white/30",
            !isConnected && "opacity-50 cursor-not-allowed"
          )}
        >
          {isVideoEnabled ? (
            <Camera className="w-6 h-6" />
          ) : (
            <CameraOff className="w-6 h-6" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="lg"
          onClick={onAudioToggle}
          disabled={!isConnected}
          className={cn(
            "rounded-full bg-black/40 backdrop-blur-sm border border-white/10 transition-all duration-300",
            "hover:scale-105 active:scale-95",
            isAudioEnabled
              ? "text-white hover:text-white/80 hover:bg-white/20 hover:border-white/30"
              : "text-white/60 hover:text-white/80 hover:bg-white/20 hover:border-white/30",
            !isConnected && "opacity-50 cursor-not-allowed"
          )}
        >
          {isAudioEnabled ? (
            <Mic className="w-6 h-6" />
          ) : (
            <MicOff className="w-6 h-6" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="lg"
          onClick={onChatToggle}
          disabled={!isConnected}
          className={cn(
            "rounded-full bg-black/40 backdrop-blur-sm border border-white/10 transition-all duration-300",
            "hover:scale-105 active:scale-95 text-white hover:text-white/80 hover:bg-white/20 hover:border-white/30",
            !isConnected && "opacity-50 cursor-not-allowed"
          )}
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      </div>
    </motion.div>
  )
} 