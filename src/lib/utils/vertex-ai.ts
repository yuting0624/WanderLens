import { SessionReport } from '../types/multimodal'
import { GoogleAuth } from 'google-auth-library'

export class VertexAIClient {
  private projectId: string
  private location: string
  private auth: GoogleAuth

  constructor() {
    // Get project ID from environment variables
    const projectId = process.env.GOOGLE_CLOUD_PROJECT
    if (!projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECTが設定されていません')
    }
    this.projectId = projectId

    // 環境変数からロケーションを取得
    this.location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'

    // Cloud Run環境ではデフォルトの認証情報を使用
    this.auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      projectId: this.projectId,
      ...(process.env.NODE_ENV === 'development' && {
        keyFile: process.env.SERVICE_ACCOUNT_KEY
      })
    })
  }

  async generateSessionReport(sessionSummary: string, messages: any[]): Promise<SessionReport> {
    try {
      console.log('認証情報を取得中...')
      const client = await this.auth.getClient()
      const accessToken = await client.getAccessToken()
      console.log('認証情報取得完了')

      console.log('APIリクエストを送信中...')
      const response = await fetch(
        `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/gemini-2.0-flash-001:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken.token}`
          },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [{
                text: `
                You are WanderLens, an Out-and-About Companion to help users enjoy their outings.
                以下のセッション情報を分析し、主な興味・関心事とおすすめのスポットを抽出してください。

セッションサマリー:
${sessionSummary}

会話履歴:
${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

以下の形式で出力して、最後にアドバイスの一言を簡潔にいれてください：適宜絵文字をいれてもいいです。出力言語はユーザーの入力言語に合わせてください。


[興味・関心事]
* 項目1
* 項目2
...

[おすすめスポット]
* スポット1
* スポット2
...

[アドバイス]
WanderLensをご利用いただきありがとうございます！
...


必ず上記の形式で出力し、各セクションの前後に余分な文字を入れないでください。`
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000,
              topP: 0.8,
              topK: 40
            }
          })
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API応答エラー: ${response.status} ${response.statusText}\n${errorText}`)
      }

      console.log('APIレスポンスを処理中...')
      const result = await response.json()
      console.log('生成されたテキスト:', JSON.stringify(result, null, 2))

      const generatedText = result.candidates[0].content.parts[0].text

      return {
        id: crypto.randomUUID(),
        userId: '', // Firestoreに保存時に設定
        sessionId: '', // Firestoreに保存時に設定
        summary: sessionSummary,
        insights: this.parseInsights(generatedText),
        recommendations: this.parseRecommendations(generatedText),
        advice: this.parseAdvice(generatedText),
        timestamp: Date.now(),
        status: 'completed'
      }
    } catch (error) {
      console.error('詳細なエラー情報:', error)
      throw error
    }
  }

  private parseInsights(text: string): string[] {
    try {
      const insightsMatch = text.match(/\[興味・関心事\]\n([\s\S]*?)(?=\n\n\[おすすめスポット\]|\n*$)/);
      if (!insightsMatch) return [];
      
      return insightsMatch[1]
        .split('\n')
        .filter(line => line.trim().startsWith('*'))
        .map(line => line.replace('*', '').trim())
        .filter(line => line !== '');
    } catch (error) {
      console.error('Insights解析エラー:', error);
      return [];
    }
  }

  private parseRecommendations(text: string): string[] {
    try {
      const recommendationsMatch = text.match(/\[おすすめスポット\]\n([\s\S]*?)(?=\n\n|\n*$)/);
      if (!recommendationsMatch) return [];
      
      return recommendationsMatch[1]
        .split('\n')
        .filter(line => line.trim().startsWith('*'))
        .map(line => line.replace('*', '').trim())
        .filter(line => line !== '');
    } catch (error) {
      console.error('Recommendations解析エラー:', error);
      return [];
    }
  }

  private parseAdvice(text: string): string[] {
    try {
      const adviceMatch = text.match(/\[アドバイス\]\n([\s\S]*?)(?=\n*$)/);
      if (!adviceMatch) return [];


      return adviceMatch[1]
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== '');
    } catch (error) {
      console.error('Advice解析エラー:', error);
      return [];
    }
  }
} 