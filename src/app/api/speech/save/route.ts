import { NextResponse } from 'next/server'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import path from 'path'

// Firebase Admin SDKの初期化
if (!getApps().length) {
  const keyFilePath = path.join(process.cwd(), 'service-account-key.json')
  initializeApp({
    credential: cert(keyFilePath),
    projectId: 'wonderlens-hack'
  })
}

const db = getFirestore()

// ローカル環境の場合、エミュレーターを使用
if (process.env.NODE_ENV === 'development') {
  db.settings({
    host: 'localhost:8080',
    ssl: false
  })
}

export async function POST(request: Request) {
  try {
    console.log('保存リクエストを受信')
    const { sessionId, messageId, transcription, role } = await request.json()
    console.log('リクエストデータ:', {
      sessionId,
      messageId,
      transcriptionLength: transcription.length,
      role
    })

    // Firestoreに文字起こし結果を保存
    console.log('Firestoreに保存開始')
    await db.collection('transcriptions').add({
      sessionId,
      messageId,
      transcription,
      role,
      timestamp: Date.now(),
    })
    console.log('Firestoreに保存完了')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Save transcription error:', error)
    return NextResponse.json(
      { error: '文字起こしの保存に失敗しました' },
      { status: 500 }
    )
  }
} 