'use client'

import { useState, type FormEvent } from 'react'
import { Camera, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion } from 'framer-motion'

interface ChatInputProps {
  onSend: (message: string, media?: File[]) => void
  isLoading?: boolean
  onClose?: () => void
}

export function ChatInput({ onSend, isLoading, onClose }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [media, setMedia] = useState<File[]>([])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (message.trim() || media.length > 0) {
      onSend(message, media)
      setMessage('')
      setMedia([])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setMedia(Array.from(e.target.files))
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="relative"
    >
      {onClose && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute -top-12 right-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white/80 hover:text-white border-0"
        >
          <X className="w-4 h-4" />
        </Button>
      )}

      <form
        onSubmit={handleSubmit}
        className="relative flex gap-2 items-center bg-black/40 backdrop-blur-md rounded-full p-2 shadow-lg"
      >
        <Input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="メッセージを入力..."
          className="flex-1 bg-transparent border-0 text-white placeholder-white/50 focus-visible:ring-0 focus-visible:ring-offset-0"
          disabled={isLoading}
        />

        <Button
          type="submit"
          size="icon"
          disabled={isLoading || !message.trim()}
          className="rounded-full bg-blue-500/20 hover:bg-blue-500/30 transition-colors duration-300 disabled:opacity-50 border-0"
        >
          <Send className="w-5 h-5 text-white/80" />
        </Button>
      </form>
    </motion.div>
  )
} 