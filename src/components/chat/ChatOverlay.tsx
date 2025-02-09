'use client'

import React, { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Message } from './Message'
import { type MultimodalMessage } from '@/lib/types/multimodal'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface ChatOverlayProps {
  messages: MultimodalMessage[]
  className?: string
  onClose?: () => void
  isVisible?: boolean
}

export function ChatOverlay({ messages, className, onClose, isVisible = true }: ChatOverlayProps) {
  const [isTyping, setIsTyping] = React.useState(false)
  const [displayMessages, setDisplayMessages] = React.useState<MultimodalMessage[]>([])
  const accumulatedMessageRef = useRef<{ [key: string]: string }>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messages.length === 0) {
      setDisplayMessages([])
      setIsTyping(false)
      accumulatedMessageRef.current = {}
      return
    }

    const lastMessage = messages[messages.length - 1]
    
    if (lastMessage.role === 'assistant') {
      if (!accumulatedMessageRef.current[lastMessage.id]) {
        accumulatedMessageRef.current[lastMessage.id] = ''
      }
      if (typeof lastMessage.content === 'string') {
        accumulatedMessageRef.current[lastMessage.id] = lastMessage.content
      }

      setIsTyping(true)

      if (lastMessage.turnComplete) {
        setIsTyping(false)
        setDisplayMessages([{
          ...lastMessage,
          content: accumulatedMessageRef.current[lastMessage.id]
        }])
      }
    }
  }, [messages])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [displayMessages])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            'absolute inset-0 flex flex-col',
            'bg-gradient-to-b from-black/0 via-black/40 to-black/60',
            'backdrop-blur-[2px]',
            className
          )}
        >
          {onClose && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-8 right-6 z-50"
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white border border-white/10 w-10 h-10"
              >
                <X className="w-5 h-5" />
              </Button>
            </motion.div>
          )}

          <div className="flex-1 overflow-y-auto scrollbar-hide pb-24">
            <div className="max-w-3xl mx-auto p-4 space-y-4">
              {messages.map((message) => {
                if (message.role === 'assistant' && typeof message.content === 'string') {
                  return (
                    <Message
                      key={message.id}
                      role="assistant"
                      content={message.content}
                      isTyping={!message.turnComplete}
                    />
                  )
                }
                return null
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 