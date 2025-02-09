'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, useAnimationControls } from 'framer-motion'
import { cn } from '@/lib/utils'

const random = (min: number, max: number) => Math.floor(Math.random() * (max - min)) + min

const generateSparkle = (minSize = 10, maxSize = 20) => {
  return {
    id: String(random(10000, 99999)),
    createdAt: Date.now(),
    size: random(minSize, maxSize),
    style: {
      top: random(0, 100) + '%',
      left: random(0, 100) + '%',
      zIndex: 2,
    },
  }
}

const DEFAULT_COLOR = '#FFF'

const Sparkle = ({ size, color, style }: { size: number; color?: string; style: any }) => {
  const path =
    'M26.5 25.5C19.0043 33.3697 0 34 0 34C0 34 19.1013 35.3684 26.5 43.5C33.234 50.901 34 70 34 70C34 70 35.6061 50.7666 43 43.5C51.2906 35.3516 70 34 70 34C70 34 51.0601 33.3469 43 25.5C35.2986 18.1495 34 0 34 0C34 0 33.0492 18.5043 26.5 25.5Z'

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 70 70"
      fill="none"
      style={style}
      className="absolute"
      initial={{ scale: 0, rotate: 0 }}
      animate={{
        scale: [0, 1, 0],
        rotate: [0, 90, 180],
      }}
      transition={{
        duration: 0.8,
        ease: 'easeInOut',
        times: [0, 0.5, 1],
      }}
      exit={{ scale: 0, rotate: 180 }}
    >
      <motion.path
        d={path}
        fill={color || DEFAULT_COLOR}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 0.8 }}
      />
    </motion.svg>
  )
}

export function Sparkles({
  color = DEFAULT_COLOR,
  children,
  className,
  minSize = 10,
  maxSize = 20,
  density = 1,
}: {
  color?: string
  children?: React.ReactNode
  className?: string
  minSize?: number
  maxSize?: number
  density?: number
}) {
  const [sparkles, setSparkles] = useState<Array<any>>([])
  const prefersReducedMotion = useRef(false)

  useEffect(() => {
    const generateSparkles = () => {
      if (prefersReducedMotion.current) return
      const now = Date.now()
      const newSparkles = [...sparkles]
      
      // Remove old sparkles
      const filtered = newSparkles.filter(sparkle => {
        const delta = now - sparkle.createdAt
        return delta < 1000
      })

      // Add new sparkles
      for (let i = 0; i < density; i++) {
        filtered.push(generateSparkle(minSize, maxSize))
      }

      setSparkles(filtered)
    }

    const interval = setInterval(generateSparkles, 100)
    return () => clearInterval(interval)
  }, [sparkles, minSize, maxSize, density])

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  return (
    <div className={cn('relative inline-block', className)}>
      {sparkles.map(sparkle => (
        <Sparkle
          key={sparkle.id}
          color={color}
          size={sparkle.size}
          style={sparkle.style}
        />
      ))}
      <div className="relative z-1">{children}</div>
    </div>
  )
} 