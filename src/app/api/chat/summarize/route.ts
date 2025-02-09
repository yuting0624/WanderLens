import { NextResponse } from 'next/server'

interface Message {
  role: 'assistant' | 'user'
  content: string
}

const SYSTEM_PROMPT = `
あなたは旅行アシスタントとして、ユーザーとの会話履歴を分析し、要約を生成します。
以下の点に注意して要約を生成してください：

1. ユーザーの主な関心事や目的
2. 提案された場所や活動
3. 決定された事項や重要な情報
4. 次回の会話で参照すべき重要なポイント

ユーザーおよび旅行アシスタントの会話履歴は不完全の場合がありますが、できるだけ理解し、まとめてください。
また、会話の主要なトピックも3-5個抽出してください。
`

export async function POST(request: Request) {
  try {
    const { messages } = await request.json() as { messages: Message[] }

    const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.NEXT_PUBLIC_GEMINI_API_KEY || '',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: SYSTEM_PROMPT
              },
              {
                text: '以下の会話を要約してください：\n\n' + 
                      messages.map(msg => `${msg.role}: ${msg.content}`).join('\n')
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.8,
          maxOutputTokens: 1024,
        },
      }),
    })

    if (!response.ok) {
      throw new Error('AI APIからのレスポンスエラー')
    }

    const data = await response.json()
    const generatedText = data.candidates[0].content.parts[0].text

    // 要約とトピックを分離
    const [summary, topicsSection] = generatedText.split('\n\nトピック:')
    const topics = topicsSection
      ? topicsSection.split('\n').map((t: string) => t.trim().replace(/^[•-]\s*/, ''))
      : []

    return NextResponse.json({
      summary: summary.trim(),
      topics: topics.filter((t: string) => t.length > 0)
    })
  } catch (error) {
    console.error('要約生成エラー:', error)
    return NextResponse.json(
      { error: '要約の生成に失敗しました' },
      { status: 500 }
    )
  }
} 