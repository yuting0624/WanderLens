'use client'

import { useEffect } from 'react'
import { motion, useAnimationControls } from 'framer-motion'
import { cn } from '@/lib/utils'

export function AnimatedText({
  text,
  className,
  once = true,
}: {
  text: string
  className?: string
  once?: boolean
}) {
  const controls = useAnimationControls()

  const words = text.split(' ')

  const animate = async () => {
    await controls.start({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.2, 0.65, 0.3, 0.9],
      },
    })
  }

  useEffect(() => {
    animate()
  }, [])

  return (
    <motion.h1
      className={cn(
        'bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent',
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={controls}
    >
      {text}
    </motion.h1>
  )
} 