import { NextResponse } from 'next/server'
import { Client } from '@googlemaps/google-maps-services-js'

const client = new Client({})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const reference = searchParams.get('reference')
    const maxwidth = searchParams.get('maxwidth') || '400'

    if (!reference) {
      return NextResponse.json(
        { error: '写真のリファレンスが必要です' },
        { status: 400 }
      )
    }

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API Keyが設定されていません')
    }

    const response = await client.placePhoto({
      params: {
        photoreference: reference,
        maxwidth: parseInt(maxwidth),
        key: process.env.GOOGLE_MAPS_API_KEY
      },
      responseType: 'arraybuffer'
    })

    const buffer = Buffer.from(response.data)
    
    return new Response(buffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400'
      }
    })
  } catch (error) {
    console.error('Place Photo API error:', error)
    return NextResponse.json(
      { error: '写真の取得に失敗しました' },
      { status: 500 }
    )
  }
} 