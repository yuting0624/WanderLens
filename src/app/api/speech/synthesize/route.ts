import { NextResponse } from 'next/server'
import { TextToSpeechClient } from '@google-cloud/text-to-speech'
import { LanguageServiceClient } from '@google-cloud/language'
import path from 'path'

const ttsClient = new TextToSpeechClient({
  keyFilename: path.join(process.cwd(), 'service-account-key.json')
})

const languageClient = new LanguageServiceClient({
  keyFilename: path.join(process.cwd(), 'service-account-key.json')
})

// 言語コードのマッピング
const languageMapping: { [key: string]: string } = {
  'ja': 'ja-JP',
  'en': 'en-US',
  'zh': 'cmn-TW',
  'ko': 'ko-KR',
  'es': 'es-US',
  'fr': 'fr-FR',
  'de': 'de-DE',
  'it': 'it-IT',
  'ru': 'ru-RU',
  'pt': 'pt-BR',
  'hi': 'hi-IN',
  'th': 'th-TH',
  'vi': 'vi-VN'
}

// 言語ごとの音声設定
const voiceSettings: { [key: string]: { name: string; ssmlGender?: 'MALE' | 'FEMALE' } } = {
  'ja-JP': { name: 'ja-JP-Neural2-B' },
  'en-US': { name: 'en-US-Journey-O' },
  'cmn-TW': { name: 'cmn-TW-Wavenet-A' },
  'ko-KR': { name: 'ko-KR-Neural2-A' },
  'es-US': { name: 'es-US-Journey-F' },
  'fr-FR': { name: 'fr-FR-Journey-F' },
  'de-DE': { name: 'de-DE-Journey-F' },
  'it-IT': { name: 'it-IT-Journey-F' },
  'ru-RU': { name: 'ru-RU-Wavenet-A' },
  'pt-BR': { name: 'pt-BR-Neural2-A' },
  'hi-IN': { name: 'hi-IN-Neural2-A' },
  'th-TH': { name: 'th-TH-Neural2-C' },
  'vi-VN': { name: 'vi-VN-Neural2-A' }
}

// 言語検出関数
async function detectLanguage(text: string): Promise<string> {
  try {
    const document = {
      content: text,
      type: 'PLAIN_TEXT' as const,
    }
    
    const [result] = await languageClient.analyzeSentiment({ document })
    const detectedLanguage = result.language || 'en'
    const baseCode = detectedLanguage.split('-')[0]
    console.log('検出された言語:', detectedLanguage)
    
    // マッピングされた言語コードを返す
    return languageMapping[baseCode] || 'en-US'
  } catch (error) {
    console.error('言語検出エラー:', error)
    return 'en-US' // エラー時はデフォルト言語
  }
}

export async function POST(request: Request) {
  try {
    const { text } = await request.json()
    console.log('音声合成リクエスト:', { textLength: text.length })

    // 言語を検出
    const languageCode = await detectLanguage(text)
    const voiceSetting = voiceSettings[languageCode]

    console.log('使用する言語設定:', { languageCode, voiceName: voiceSetting.name })

    const [response] = await ttsClient.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode,
        name: voiceSetting.name,
        ssmlGender: voiceSetting.ssmlGender
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.0,
        pitch: 0.0,
        volumeGainDb: 0.0,
        effectsProfileId: ['small-bluetooth-speaker-class-device']
      },
    })

    console.log('音声合成完了')
    return new NextResponse(response.audioContent, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'X-Detected-Language': languageCode,
        'X-Voice-Name': voiceSetting.name
      },
    })
  } catch (error) {
    console.error('音声合成エラー:', error)
    return NextResponse.json(
      { error: '音声合成に失敗しました' },
      { status: 500 }
    )
  }
} 