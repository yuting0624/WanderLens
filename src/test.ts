import { VertexAIClient } from "./lib/utils/vertex-ai"

async function main() {
  try {
    const vertexAI = new VertexAIClient()
    const testReport = await vertexAI.generateSessionReport(
      "テスト用セッションサマリー",
      [
        { role: "user", content: "京都のおすすめスポットを教えてください" },
        { role: "assistant", content: "京都には素晴らしい観光スポットが多くあります。特に金閣寺や清水寺は..." }
      ]
    )
    console.log('レポート生成結果:', testReport)
  } catch (error) {
    console.error('エラーが発生しました:', error)
  }
}

main()
