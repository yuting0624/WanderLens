import { NextResponse } from 'next/server'
import { Client, PlacesNearbyRanking } from '@googlemaps/google-maps-services-js'

const client = new Client({})

export async function POST(request: Request) {
  try {
    const { keyword, radius, language, location } = await request.json()

    if (!location || !location.lat || !location.lng) {
      return NextResponse.json(
        { error: '位置情報が必要です' },
        { status: 400 }
      )
    }

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API Keyが設定されていません')
    }

    const response = await client.placesNearby({
      params: {
        location: { lat: location.lat, lng: location.lng },
        radius: radius || 1000,
        keyword,
        language: language || 'ja',
        key: process.env.GOOGLE_MAPS_API_KEY,
        rankby: radius ? undefined : PlacesNearbyRanking.distance,
        type: getPlaceType(keyword),
        opennow: true
      }
    })

    if (!response.data.results || response.data.results.length === 0) {
      return NextResponse.json({
        places: [],
        message: '指定された条件に一致する場所が見つかりませんでした'
      })
    }

    // レスポンスを整形
    const places = response.data.results.map(place => ({
      placeId: place.place_id,
      name: place.name,
      address: place.vicinity,
      location: place.geometry?.location,
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      types: place.types,
      openNow: place.opening_hours?.open_now,
      priceLevel: place.price_level,
      businessStatus: place.business_status,
      photos: place.photos?.map(photo => ({
        photoReference: photo.photo_reference,
        height: photo.height,
        width: photo.width,
        attributions: photo.html_attributions
      })),
      distance: calculateDistance(
        location.lat,
        location.lng,
        place.geometry?.location.lat || 0,
        place.geometry?.location.lng || 0
      )
    }))

    // 距離でソート
    places.sort((a, b) => a.distance - b.distance)

    // 上位3件に制限
    const limitedPlaces = places.slice(0, 3)

    return NextResponse.json({
      places: limitedPlaces,
      totalResults: places.length,
      searchMetadata: {
        keyword,
        location,
        radius: radius || '最寄り',
        language: language || 'ja',
        displayedResults: limitedPlaces.length
      }
    })
  } catch (error) {
    console.error('Places API error:', error)
    return NextResponse.json(
      { error: '近隣施設の検索に失敗しました' },
      { status: 500 }
    )
  }
}

// キーワードに基づいて適切なPlaceタイプを返す
function getPlaceType(keyword: string): string | undefined {
  const keywordMap: { [key: string]: string } = {
    'レストラン': 'restaurant',
    '食事': 'restaurant',
    'カフェ': 'cafe',
    '観光': 'tourist_attraction',
    '神社': 'shrine',
    '寺': 'temple',
    'ホテル': 'lodging',
    '駅': 'train_station',
    '公園': 'park',
    '美術館': 'museum',
    'スーパー': 'supermarket',
    'コンビニ': 'convenience_store',
    'クラブ': 'night_club',
    'ATM': 'atm',
    '銀行': 'bank',
    'カラオケ': 'karaoke',
    '図書館': 'library',
    'Hotel': 'hotel',
    'bar': 'bar',
  }

  for (const [key, value] of Object.entries(keywordMap)) {
    if (keyword.toLowerCase().includes(key.toLowerCase())) {
      return value
    }
  }

  return undefined
}

// 2点間の距離を計算（ヘイバーサイン公式）
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // 地球の半径（km）
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c * 1000 // メートル単位で返す
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
} 