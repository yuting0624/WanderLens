import { NextResponse } from 'next/server'
import { Client, TravelMode, Language } from '@googlemaps/google-maps-services-js'

// Initialize Google Maps client
const client = new Client({})

export async function POST(request: Request) {
  try {
    const { origin, destination, mode } = await request.json()

    // Validate input
    if (!origin || !destination) {
      return NextResponse.json(
        { error: '出発地と目的地が必要です' },
        { status: 400 }
      )
    }

    // Check for API key
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      throw new Error('Google Maps API key is not set')
    }

    // Get directions from Google Maps API
    const response = await client.directions({
      params: {
        origin: origin,
        destination: destination,
        mode: mode as TravelMode,
        language: Language.ja,
        key: apiKey
      }
    })

    if (response.data.status === 'ZERO_RESULTS') {
      return NextResponse.json(
        { error: '経路が見つかりませんでした' },
        { status: 404 }
      )
    }

    // Format the response
    const route = response.data.routes[0]
    const formattedResponse = {
      routes: [{
        distance: {
          text: route.legs[0].distance.text,
          value: route.legs[0].distance.value
        },
        duration: {
          text: route.legs[0].duration.text,
          value: route.legs[0].duration.value
        },
        steps: route.legs[0].steps.map(step => ({
          distance: step.distance,
          duration: step.duration,
          instructions: step.html_instructions,
          polyline: step.polyline
        })),
        overview_polyline: route.overview_polyline
      }]
    }

    return NextResponse.json(formattedResponse)
  } catch (error) {
    console.error('Directions API error:', error)
    return NextResponse.json(
      { error: '経路の取得中にエラーが発生しました' },
      { status: 500 }
    )
  }
} 