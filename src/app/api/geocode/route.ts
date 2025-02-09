import { NextResponse } from 'next/server'
import { Client } from '@googlemaps/google-maps-services-js'

const client = new Client({})

export async function POST(request: Request) {
  try {
    const { address } = await request.json()

    if (!address) {
      return NextResponse.json(
        { error: '住所または場所名が必要です' },
        { status: 400 }
      )
    }

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API Keyが設定されていません')
    }

    const response = await client.geocode({
      params: {
        address,
        language: 'ja',
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    })

    if (!response.data.results || response.data.results.length === 0) {
      return NextResponse.json(
        { error: '指定された場所が見つかりませんでした' },
        { status: 404 }
      )
    }

    const location = response.data.results[0].geometry.location
    const formattedAddress = response.data.results[0].formatted_address

    return NextResponse.json({
      location,
      formattedAddress
    })
  } catch (error) {
    console.error('Geocoding API error:', error)
    return NextResponse.json(
      { error: '位置情報の取得に失敗しました' },
      { status: 500 }
    )
  }
} 