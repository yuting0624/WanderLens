import { NextResponse } from 'next/server'
import { TranslationServiceClient } from '@google-cloud/translate'

const translationClient = new TranslationServiceClient()

export async function POST(request: Request) {
  try {
    const { text } = await request.json()
    const projectId = process.env.NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_ID

    if (!text) {
      return NextResponse.json(
        { error: 'テキストは必須です' },
        { status: 400 }
      )
    }

    const request_ = {
      parent: `projects/${projectId}/locations/global`,
      content: text,
      mimeType: 'text/plain',
    }

    const [response] = await translationClient.detectLanguage(request_)

    const languages = response.languages?.map(lang => ({
      languageCode: lang.languageCode,
      confidence: lang.confidence
    }))

    return NextResponse.json({ languages })
  } catch (error) {
    console.error('Language Detection API error:', error)
    return NextResponse.json(
      { error: '言語検出に失敗しました' },
      { status: 500 }
    )
  }
} 