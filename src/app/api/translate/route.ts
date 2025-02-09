import { NextResponse } from 'next/server'
import { v2 } from '@google-cloud/translate'

const { Translate } = v2

export async function POST(request: Request) {
  try {
    const { text, targetLanguage, sourceLanguage } = await request.json()

    if (!text || !targetLanguage) {
      return NextResponse.json(
        { error: 'テキストと対象言語は必須です' },
        { status: 400 }
      )
    }

    if (!process.env.NEXT_PUBLIC_GOOGLE_PROJECT_ID) {
      throw new Error('GOOGLE_PROJECT_IDが設定されていません')
    }

    const translate = new Translate({
      projectId: process.env.NEXT_PUBLIC_GOOGLE_PROJECT_ID,
      key: process.env.GOOGLE_MAPS_API_KEY
    })

    console.log('翻訳リクエスト:', { text, targetLanguage, sourceLanguage })

    const options: { to: string; from?: string } = {
      to: targetLanguage
    }

    if (sourceLanguage) {
      options.from = sourceLanguage
    }

    const [translation] = await translate.translate(text, options)
    console.log('翻訳結果:', translation)

    return NextResponse.json({
      translatedText: translation,
      detectedSourceLanguage: sourceLanguage || 'auto'
    })
  } catch (error) {
    console.error('Translation API error:', error)
    return NextResponse.json(
      { error: '翻訳に失敗しました: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
} 