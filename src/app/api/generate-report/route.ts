import { NextResponse } from 'next/server'
import { VertexAIClient } from '@/lib/utils/vertex-ai'

export async function POST(request: Request) {
  try {
    const { summary, messages } = await request.json()

    const vertexAI = new VertexAIClient()
    const sessionReport = await vertexAI.generateSessionReport(summary, messages)

    return NextResponse.json(sessionReport)
  } catch (error) {
    console.error('レポート生成エラー:', error)
    return NextResponse.json(
      { error: 'レポートの生成に失敗しました' },
      { status: 500 }
    )
  }
} 