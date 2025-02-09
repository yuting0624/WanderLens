/// <reference types="@types/google.maps" />
import { useEffect, useRef } from 'react'
import { Loader } from '@googlemaps/js-api-loader'
import { motion } from 'framer-motion'

interface DirectionsMapProps {
  route: {
    distance: { text: string }
    duration: { text: string }
    overview_polyline: { points: string }
    steps: Array<{
      distance: { text: string }
      duration: { text: string }
      instructions: string
      polyline: { points: string }
    }>
  }
  origin: string
  destination: string
}

const DirectionsMap: React.FC<DirectionsMapProps> = ({ route, origin, destination }) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)

  useEffect(() => {
    const initMap = async () => {
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        version: 'weekly',
        libraries: ['places', 'geometry']
      })

      try {
        const google = await loader.load()
        
        if (!mapRef.current) return

        // 地図の初期化
        const map = new google.maps.Map(mapRef.current, {
          zoom: 14,
          center: { lat: 35.6812, lng: 139.7671 }, // 東京駅付近を初期位置に
          styles: [
            {
              elementType: 'geometry',
              stylers: [{ color: '#242f3e' }]
            },
            {
              elementType: 'labels.text.stroke',
              stylers: [{ color: '#242f3e' }]
            },
            {
              elementType: 'labels.text.fill',
              stylers: [{ color: '#746855' }]
            },
            {
              featureType: 'administrative.locality',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#d59563' }]
            },
            {
              featureType: 'poi',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#d59563' }]
            },
            {
              featureType: 'poi.park',
              elementType: 'geometry',
              stylers: [{ color: '#263c3f' }]
            },
            {
              featureType: 'poi.park',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#6b9a76' }]
            },
            {
              featureType: 'road',
              elementType: 'geometry',
              stylers: [{ color: '#38414e' }]
            },
            {
              featureType: 'road',
              elementType: 'geometry.stroke',
              stylers: [{ color: '#212a37' }]
            },
            {
              featureType: 'road',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#9ca5b3' }]
            },
            {
              featureType: 'road.highway',
              elementType: 'geometry',
              stylers: [{ color: '#746855' }]
            },
            {
              featureType: 'road.highway',
              elementType: 'geometry.stroke',
              stylers: [{ color: '#1f2835' }]
            },
            {
              featureType: 'road.highway',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#f3d19c' }]
            },
            {
              featureType: 'transit',
              elementType: 'geometry',
              stylers: [{ color: '#2f3948' }]
            },
            {
              featureType: 'transit.station',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#d59563' }]
            },
            {
              featureType: 'water',
              elementType: 'geometry',
              stylers: [{ color: '#17263c' }]
            },
            {
              featureType: 'water',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#515c6d' }]
            },
            {
              featureType: 'water',
              elementType: 'labels.text.stroke',
              stylers: [{ color: '#17263c' }]
            }
          ],
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false
        })

        mapInstanceRef.current = map

        // 現在地の取得と表示
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const currentLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              }

              // 現在地のマーカーを追加
              new google.maps.Marker({
                position: currentLocation,
                map,
                title: '現在地',
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: '#4285F4',
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 2
                }
              })

              // ルートの表示
              if (route && route.overview_polyline && route.overview_polyline.points) {
                const bounds = new google.maps.LatLngBounds()
                bounds.extend(currentLocation)

                const decodedPath = google.maps.geometry.encoding.decodePath(route.overview_polyline.points)
                if (decodedPath && decodedPath.length > 0) {
                  const polyline = new google.maps.Polyline({
                    path: decodedPath,
                    geodesic: true,
                    strokeColor: '#4285F4',
                    strokeOpacity: 1.0,
                    strokeWeight: 4
                  })
                  
                  polyline.setMap(map)
                  decodedPath.forEach(point => bounds.extend(point))

                  // 目的地のマーカーを追加
                  new google.maps.Marker({
                    position: decodedPath[decodedPath.length - 1],
                    map,
                    title: '目的地',
                    icon: {
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: 10,
                      fillColor: '#EA4335',
                      fillOpacity: 1,
                      strokeColor: '#ffffff',
                      strokeWeight: 2
                    }
                  })

                  // 地図の表示範囲を調整
                  map.fitBounds(bounds)
                  const zoom = map.getZoom()
                  if (zoom && zoom > 16) {
                    map.setZoom(16)
                  }
                }
              }
            },
            (error) => {
              console.error('現在地の取得に失敗しました:', error)
            }
          )
        }

      } catch (error) {
        console.error('地図の読み込みエラー:', error)
      }
    }

    initMap()
  }, [route])

  // routeの値をチェック
  useEffect(() => {
    console.log('Route prop:', route)
    console.log('Route info:', {
      distance: route?.distance,
      duration: route?.duration
    })
  }, [route])

  return (
    <div className="relative w-full h-[400px] rounded-2xl overflow-hidden shadow-lg">
      <div ref={mapRef} className="w-full h-full" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-4 left-4 right-4"
      >
        <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 shadow-lg text-white/90">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <span className="font-medium">所要時間:</span>
              <span>{route?.duration?.text || '計算中...'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-medium">総距離:</span>
              <span>{route?.distance?.text || '計算中...'}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default DirectionsMap 