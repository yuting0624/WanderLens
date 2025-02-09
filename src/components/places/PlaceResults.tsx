import { PlaceCard } from './PlaceCard'
import { ScrollArea } from '../ui/scroll-area'
import { motion } from 'framer-motion'

interface Place {
  name: string
  rating?: number
  address?: string
  distance: number
  openNow?: boolean
  photos?: Array<{
    photoReference: string
    width: number
    height: number
  }>
}

interface PlaceResultsProps {
  places: Place[]
  totalResults: number
  keyword: string
}

export function PlaceResults({
  places,
  totalResults,
  keyword
}: PlaceResultsProps) {
  if (!places || places.length === 0) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-4 bg-black/40 backdrop-blur-md rounded-2xl p-4 shadow-lg"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-white/90">
          {keyword}の検索結果
        </h2>
      </div>
      <ScrollArea className="max-h-[50vh] md:max-h-[60vh] pr-4">
        <div className="space-y-3">
          {places.map((place, index) => (
            <PlaceCard key={index} {...place} />
          ))}
        </div>
      </ScrollArea>
    </motion.div>
  )
} 