import { Star, Clock, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface PlaceCardProps {
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

export function PlaceCard({
  name,
  rating,
  address,
  distance,
  openNow,
  photos
}: PlaceCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-black/40 backdrop-blur-md rounded-xl overflow-hidden shadow-lg transition-colors duration-300 hover:bg-black/50"
    >
      <div className="flex">
        {photos && photos.length > 0 && (
          <div className="w-24 h-24 sm:w-32 sm:h-32 relative flex-shrink-0">
            <img
              src={`/api/places/photo?reference=${photos[0].photoReference}&maxwidth=400`}
              alt={name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="flex-1 p-3 sm:p-4">
          <h3 className="text-base sm:text-lg font-semibold text-white/90 truncate">{name}</h3>
          <div className="mt-1.5 sm:mt-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
            {rating && (
              <div className="flex items-center gap-1 bg-black/20 rounded-full px-2 py-0.5">
                <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400 fill-yellow-400" />
                <span className="text-xs sm:text-sm font-medium text-white/90">{rating}</span>
              </div>
            )}
            <div className="flex items-center gap-1 bg-black/20 rounded-full px-2 py-0.5">
              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
              <span className="text-xs sm:text-sm font-medium text-white/90">{Math.round(distance)}m</span>
            </div>
            {openNow !== undefined && (
              <div className="flex items-center gap-1 bg-black/20 rounded-full px-2 py-0.5">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400" />
                <span className={cn(
                  "text-xs sm:text-sm font-medium",
                  openNow ? "text-green-400" : "text-red-400"
                )}>
                  {openNow ? "営業中" : "営業時間外"}
                </span>
              </div>
            )}
          </div>
          {address && (
            <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-white/70 line-clamp-2">
              {address}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
} 