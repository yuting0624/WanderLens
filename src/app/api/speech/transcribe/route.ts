import { NextResponse } from 'next/server'
import { SpeechClient } from '@google-cloud/speech'
import path from 'path'

// サービスアカウントキーファイルのパスを取得
const keyFilePath = path.join(process.cwd(), 'service-account-key.json')

const speechClient = new SpeechClient({
  keyFilename: keyFilePath
})

export async function POST(request: Request) {
  try {
    console.log('文字起こしリクエストを受信')
    const { audioData } = await request.json()
    console.log('音声データを受信:', audioData.length)

    // Base64文字列をバッファに変換
    const audioBuffer = Buffer.from(audioData, 'base64')
    console.log('音声バッファを作成:', audioBuffer.length)

    // 音声認識リクエストの設定
    const config = {
      encoding: 'LINEAR16' as const,
      sampleRateHertz: 24000,
      languageCode: 'ja-JP',
    }

    const audio = {
      content: audioBuffer,
    }

    console.log('Speech-to-Text APIにリクエスト送信')
    // 音声認識の実行
    const [response] = await speechClient.recognize({
      config,
      audio,
    })
    console.log('Speech-to-Text APIからレスポンス受信:', response)

    const transcription = response.results
      ?.map(result => result.alternatives?.[0]?.transcript)
      .join('\n')

    console.log('文字起こし結果:', transcription)
    return NextResponse.json({ transcription })
  } catch (error) {
    console.error('Speech-to-text error:', error)
    return NextResponse.json(
      { error: '音声認識に失敗しました' },
      { status: 500 }
    )
  }
} 