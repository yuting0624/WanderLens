import React from 'react'
import { cn } from '@/lib/utils'
import { Bot } from 'lucide-react'
import { motion } from 'framer-motion'

interface MessageProps {
  role: 'assistant' | 'user'
  content: string
  className?: string
  isTyping?: boolean
}

export function Message({ content, className, isTyping }: MessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex items-start gap-3',
        'group transition-all duration-300',
        className
      )}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center backdrop-blur-sm transition-transform group-hover:scale-110">
        <Bot className="w-4 h-4 text-primary transition-colors group-hover:text-primary/80" />
      </div>
      
      <div className={cn(
        'flex-1 text-sm leading-relaxed',
        isTyping && 'animate-pulse'
      )}>
        <div className="relative">
          <div className="absolute -left-2 top-3 w-2 h-2 bg-gradient-to-br from-primary/20 to-primary/10 rotate-45 backdrop-blur-sm" />
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/10">
            <p className="whitespace-pre-wrap break-words text-foreground/90">
              {content}
            </p>
            {isTyping && (
              <div className="flex gap-1 mt-2">
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-primary/40"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1, repeatDelay: 0.2 }}
                />
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-primary/40"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1, delay: 0.2, repeatDelay: 0.2 }}
                />
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-primary/40"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1, delay: 0.4, repeatDelay: 0.2 }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
} 