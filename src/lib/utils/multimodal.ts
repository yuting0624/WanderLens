import { type MultimodalMessage, type ContentMessage, type MessagePart, type VideoProcessor, type AudioProcessor } from '../types/multimodal'
import { EventEmitter } from 'eventemitter3'
import { SpeechProcessor } from './speech'
import { AudioBufferManager } from './audioBuffer'
import { SessionMemoryManager, type SessionMemory } from './session-memory'
import { v4 as uuidv4 } from 'uuid'
import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { MemoryManagerImpl } from './memory'
import { Memory } from '../types/memory'
import { FirestoreClient } from './firestore'

export class MultimodalClient extends EventEmitter {
  private ws: WebSocket | null = null
  private messageCallback: ((message: MultimodalMessage) => void) | null = null
  private errorCallback: ((error: string) => void) | null = null
  private currentResponse: string = ''
  private isGenerating: boolean = false
  private currentVideoStream: MediaStream | null = null
  private currentAudioStream: MediaStream | null = null
  private videoProcessor: VideoProcessor | null = null
  private audioProcessor: AudioProcessor | null = null
  private audioContext: AudioContext | null = null
  private audioStreamer: AudioStreamer | null = null
  private speechProcessor: SpeechProcessor | null = null
  private audioBuffer: AudioBufferManager | null = null
  private currentMessageId: string | null = null
  private sessionMemory: SessionMemoryManager
  private memoryManager: MemoryManagerImpl
  private user: any = null
  private memories: Memory[] = []

  constructor(private apiKey: string) {
    super()
    this.initAudioContext()
    this.speechProcessor = new SpeechProcessor()
    this.audioBuffer = new AudioBufferManager()
    this.sessionMemory = new SessionMemoryManager()
    this.memoryManager = new MemoryManagerImpl()
    
    // 認証状態の監視
    onAuthStateChanged(auth, async (user) => {
      this.user = user
      if (user) {
        // ユーザーのメモリを読み込む
        this.memories = await this.memoryManager.getMemories(user.uid)
      } else {
        this.memories = []
      }
    })
  }

  private async initAudioContext() {
    try {
      this.audioContext = new AudioContext({
        sampleRate: 24000,
        latencyHint: 'interactive'
      })
      await this.audioContext.resume() // オーディオコンテキストを有効化
      this.audioStreamer = new AudioStreamer(this.audioContext)
    } catch (error) {
      console.error('オーディオコンテキストの初期化に失敗しました:', error)
    }
  }

  private async buildSystemPrompt(): Promise<string> {
    let prompt = `
You are WanderLens, an Out-and-About Companion to help users enjoy their outings by offering real-time interpretation, local navigation, cultural insights, and practical travel tips. Whether the user is looking for directions, local attractions, or language assistance, provide clear and helpful support.

**Behavior:**
- **Clear and Accessible Communication:**  
  - Use simple and concise language suitable for travelers who may not be experts in the local language.
  - Speak clearly and at a moderate pace; ensure that responses are brief and to the point.
- **Image Analysis & Expansion:**  
  When an image is sent—whether it's of a landmark, scenery, or text—analyze it and broaden the discussion by mentioning related topics and offering contextual insights.
- **Context Awareness and Personalization:**  
  - Incorporate the user's current location and previously stored preferences (e.g., favorite cuisines, interest in historical sites) to tailor recommendations.
  - If the user provides images (e.g., a picture of a station or signboard), analyze and translate them accurately to offer relevant local information.
- **Interactive Guidance:**  
  - Prompt the user for clarifications when details are ambiguous.
  - Confirm collected information before proceeding.
- **Real-Time Responsiveness:**  
  - Continuously update recommendations based on new inputs, ensuring that responses remain timely and contextually relevant.
- **Avoid Hallucination:**  
  - Provide responses based only on verifiable data from the available tools. If uncertain, ask for clarification rather than assuming details.
- **Cultural Sensitivity:**  
  - Adapt responses to respect local customs and language nuances.
- **Response Style:**  
  - Keep responses clear, concise, and at a pace that allows the user time to think and reply.  Provide advice and recommendations in a friendly and engaging manner.
  - Do not hallucinate—if uncertain, ask for clarification.  
  - Incorporate contextual cues from previously saved session memories to personalize responses.
- **Tool Usage Guidelines:**  
  - Use **searchNearbyPlaces** to find local attractions or facilities based on keywords and location data.  User's current location is basically provided, so you don't need to ask for it.
  - Use **getDirections** to provide step-by-step walk or bicycle instructions based on user images or queries. Please note that train or bus transit info is not able at this moment. User's current location is basically provided, so you don't need to ask for it.
  - Use **translateText** to translate any text as needed so that the response is always in the user's language.  
  - Use **updateSessionSummary** to keep track of recent conversation context and ensure continuity across sessions. Use this tool if the user asks you to specifically remember something.
  - Use **googleSearch** proactively when the user's query lacks sufficient detail.
  
## Example Roleplay:
- **Agent:** "こんにちは！WanderLensです。今日はどちらにお出かけの予定ですか？"
- **User:** "渋谷に行きたいんだけど、どの路線を使えばいいか教えてもらえますか？"
- **Agent:** "了解しました。現在の最寄り駅の写真を送っていただけますか？それをもとに、最適な経路をご案内します。"
- **User:** *[駅の写真を送信]*
- **Agent:** "googleSearch Toolを使用.この駅は渋谷行きの複数の路線が利用可能です。例えば、○○線を使えます。お出かけ前に最新の天気情報もお伝えしますね。"
- **User:** "ありがとう、あと現地で注文するときのフレーズも知りたいな。"
- **Agent:** "もちろんです。例えば、カフェで『アイスコーヒーをお願いします』と言えば通じます。ほかに何かご質問はありますか？"\n\n`

    // メモリが存在する場合、コンテキストとして追加
    if (this.memories.length > 0) {
      prompt += `\n\nユーザーの過去の行動と興味：\n`
      
      // 最新の10件のメモリを使用
      const recentMemories = this.memories
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10)

      recentMemories.forEach(memory => {
        switch (memory.type) {
          case 'place':
            prompt += `- 検索した場所: ${memory.summary}\n`
            break
          case 'route':
            prompt += `- 経路検索: ${memory.summary}\n`
            break
          case 'conversation':
            prompt += `- 興味: ${memory.summary}\n`
            break
        }
      })
    }

    return prompt
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const host = "generativelanguage.googleapis.com";
        const uri = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;
        this.ws = new WebSocket(uri)
        
        this.ws.onopen = () => {
          console.log('WebSocket接続が確立されました')
          // セッション設定を送信
          this.sendSessionConfig()
          resolve()
        }

        this.ws.onmessage = async (event) => {
          try {
            let data;
            if (event.data instanceof Blob) {
              const text = await event.data.text();
              data = JSON.parse(text);
            } else {
              data = JSON.parse(event.data);
            }

            if (data.error) {
              console.error('エラーメッセージを受信:', data.error)
              if (this.errorCallback) {
                this.errorCallback(data.error.message || 'エラーが発生しました')
              }
              return
            }

            // セットアップ完了メッセージの処理
            if (data.setupComplete) {
              console.log('セットアップが完了しました')
              return
            }

            // モデルからの応答の処理
            if (data.serverContent?.modelTurn?.parts) {
              this.handleModelResponse(data.serverContent.modelTurn.parts);
            }

            // ターン完了の処理
            if (data.serverContent?.turnComplete) {
              this.handleTurnComplete();
            }

          } catch (error) {
            console.error('メッセージの解析エラー:', error)
            if (this.errorCallback) {
              this.errorCallback('メッセージの解析に失敗しました')
            }
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocketエラー:', error)
          if (this.errorCallback) {
            this.errorCallback('WebSocket接続エラーが発生しました')
          }
          reject(error)
        }

        this.ws.onclose = (event) => {
          console.log('WebSocket接続が閉じられました', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          })
          if (this.errorCallback) {
            this.errorCallback(`WebSocket接続が閉じられました。コード: ${event.code}, 理由: ${event.reason || '不明'}`)
          }
        }
      } catch (error) {
        console.error('WebSocket接続エラー:', error)
        if (this.errorCallback) {
          this.errorCallback('WebSocket接続の確立に失敗しました')
        }
        reject(error)
      }
    })
  }

  private async sendSessionConfig() {
    if (!this.ws) return

    // 最新のセッション履歴のみを取得
    const previousHistory = await this.sessionMemory.getSessionHistory(1)
    let contextPrompt = "あなたは親切な旅行アシスタントです。異なるバックグラウンドを持つユーザーと会話するため、直前の会話と同じ言語で返答してください。ただし、回答にアスタリスクや符号は絶対に含めないでください。\n\n"

    if (previousHistory.length > 0 && previousHistory[0].summary) {
      contextPrompt += "前回の会話要約:\n"
      contextPrompt += `${previousHistory[0].summary}\n\n`
      
      if (previousHistory[0].topics && previousHistory[0].topics.length > 0) {
        // トピックに基づいて関連する過去の会話を検索
        const relatedSessions = await this.findRelatedSessions(previousHistory[0].topics)
        if (relatedSessions.length > 0) {
          contextPrompt += "関連する過去の会話:\n"
          for (const session of relatedSessions) {
            if (session.summary) {
              contextPrompt += `- ${session.summary}\n`
            }
          }
          contextPrompt += "\n"
        }

        contextPrompt += `現在の主要トピック: ${previousHistory[0].topics.join(', ')}\n`
      }
    }

    const systemPrompt = await this.buildSystemPrompt()

    const config = {
      setup: {
        model: "models/gemini-2.0-flash-exp",
        generationConfig: {
          responseModalities: "AUDIO",
          candidate_count: 1,
          stop_sequences: [],
          temperature: 0.7,
          top_k: 40,
          top_p: 0.8,
          max_output_tokens: 1024,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
          }
        },
        systemInstruction: {
          parts: [
            {
              text: systemPrompt
            }
          ]
        },
        tools: [
          { googleSearch: {} },
          {
            function_declarations: [
              {
                name: "searchNearbyPlaces",
                description: "ユーザーの現在位置周辺の場所を検索します",
                parameters: {
                  type: "object",
                  properties: {
                    keyword: {
                      type: "string",
                      description: "検索キーワード（例：レストラン、観光スポット）"
                    },
                    radius: {
                      type: "number",
                      description: "検索範囲（メートル）"
                    },
                    language: {
                      type: "string",
                      description: "結果の言語（例：ja, en）"
                    },
                    locationQuery: {
                      type: "string",
                      description: "場所名（例：東京タワー）"
                    }
                  },
                  required: ["keyword"]
                }
              },
              {
                name: "getDirections",
                description: "現在地から目的地までの経路を案内します",
                parameters: {
                  type: "object",
                  properties: {
                    destination: {
                      type: "string",
                      description: "目的地の名前または住所"
                    },
                    mode: {
                      type: "string",
                      description: "移動手段（walking, driving, bicycling）",
                      enum: ["walking", "driving", "bicycling"]
                    }
                  },
                  required: ["destination"]
                }
              },
              {
                name: "translateText",
                description: "テキストを指定された言語に翻訳します",
                parameters: {
                  type: "object",
                  properties: {
                    text: {
                      type: "string",
                      description: "翻訳するテキスト"
                    },
                    targetLanguage: {
                      type: "string",
                      description: "翻訳先の言語コード（例：ja, en, zh）"
                    },
                    sourceLanguage: {
                      type: "string",
                      description: "翻訳元の言語コード（自動検出の場合は省略可）"
                    }
                  },
                  required: ["text", "targetLanguage"]
                }
              },
              {
                name: 'updateSessionSummary',
                description: 'セッションの会話内容を要約してメモリに保存します',
                parameters: {
                  type: 'object',
                  properties: {
                    summary: {
                      type: 'string',
                      description: '会話の要約'
                    },
                    messages: {
                      type: 'array',
                      description: '会話履歴',
                      items: {
                        type: 'object',
                        properties: {
                          role: {
                            type: 'string',
                            description: 'メッセージの送信者（user または assistant）'
                          },
                          content: {
                            type: 'string',
                            description: 'メッセージの内容'
                          }
                        }
                      }
                    }
                  },
                  required: ['summary', 'messages']
                }
              }
            ]
          }
        ]
      }
    }

    console.log('送信するセットアップ設定:', JSON.stringify(config, null, 2))
    this.ws.send(JSON.stringify(config))
  }

  // 関連セッションを検索する新しいメソッド
  private async findRelatedSessions(topics: string[]): Promise<SessionMemory[]> {
    try {
      const allSessions = await this.sessionMemory.getSessionHistory(10)
      const relatedSessions = allSessions.filter(session => {
        if (!session.topics) return false
        // トピックの重複度に基づいてセッションの関連性をスコア化
        const commonTopics = session.topics.filter(topic => 
          topics.some(currentTopic => 
            currentTopic.toLowerCase().includes(topic.toLowerCase()) ||
            topic.toLowerCase().includes(currentTopic.toLowerCase())
          )
        )
        return commonTopics.length > 0
      })

      // 関連性の高い順に最大3つのセッションを返す
      return relatedSessions
        .sort((a, b) => {
          const aCommonTopics = a.topics?.filter(topic => 
            topics.some(currentTopic => currentTopic.toLowerCase().includes(topic.toLowerCase()))
          ).length || 0
          const bCommonTopics = b.topics?.filter(topic => 
            topics.some(currentTopic => currentTopic.toLowerCase().includes(topic.toLowerCase()))
          ).length || 0
          return bCommonTopics - aCommonTopics
        })
        .slice(0, 3)
    } catch (error) {
      console.error('関連セッションの検索に失敗しました:', error)
      return []
    }
  }

  async sendMessage(message: string, media?: File[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket接続が確立されていません')
    }

    // 現在のセッションから最新のメッセージのみを取得
    const currentSession = await this.sessionMemory.getSessionHistory(1)
    const lastMessage = currentSession.length > 0 && currentSession[0].messages.length > 0
      ? currentSession[0].messages[currentSession[0].messages.length - 1]
      : null

    const parts: MessagePart[] = [
      {
        text: message
      }
    ]

    if (media && media.length > 0) {
      for (const file of media) {
        const base64 = await this.fileToBase64(file)
        parts.push({
          text: '',
          image_bytes: {
            data: base64
          }
        })
      }
    }

    const content = {
      clientContent: {
        turns: [
          ...(lastMessage ? [{
            role: lastMessage.role,
            parts: [{
              text: lastMessage.content
            }]
          }] : []),
          {
            role: 'user' as const,
            parts
          }
        ],
        turnComplete: true
      }
    }

    console.log('送信するメッセージ:', JSON.stringify(content, null, 2))
    this.ws.send(JSON.stringify(content))
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const base64 = reader.result as string
        resolve(base64.split(',')[1])
      }
      reader.onerror = (error) => reject(error)
    })
  }

  onMessage(callback: (message: MultimodalMessage) => void) {
    this.messageCallback = callback
  }

  onError(callback: (error: string) => void) {
    this.errorCallback = callback
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  private async handleModelResponse(parts: any[]) {
    // Function Callの処理
    const functionCall = parts.find((part: any) => 
      part.functionCall || 
      (part.executableCode && (
        part.executableCode.code.includes('searchNearbyPlaces') ||
        part.executableCode.code.includes('translateText') ||
        part.executableCode.code.includes('getDirections') ||
        part.executableCode.code.includes('updateSessionSummary')
      ))
    )

    if (functionCall && this.messageCallback) {
      try {
        console.log('Function Callを処理:', functionCall)
        let result = null
        let retryCount = 0
        const maxRetries = 3

        const processUpdateSessionSummary = async (code: string): Promise<any> => {
          try {
            console.log('セッションサマリーの更新を開始:', { code })
            
            // 改行を含むより柔軟なパターンマッチング
            const summaryMatch = code.match(/summary=(['"])([\s\S]*?)\1\s*\)/)
            const messagesMatch = code.match(/messages=\[\s*([\s\S]*?)\s*\]/)
            
            if (summaryMatch && messagesMatch) {
              const summary = summaryMatch[2]
              const messagesStr = messagesMatch[1]
              
              console.log('メッセージと要約を抽出:', { 
                messagesStrLength: messagesStr.length,
                summary 
              })
              
              // メッセージの解析を改善
              const messages = messagesStr
                .split('default_api.UpdatesessionsummaryMessages')
                .filter((str: string) => str.includes('role') && str.includes('content'))
                .map((str: string) => {
                  // 改行を含む柔軟なマッチング
                  const roleMatch = str.match(/role=(['"])(.*?)\1/)
                  const contentMatch = str.match(/content=(['"])([\s\S]*?)\1/)
                  
                  if (roleMatch && contentMatch) {
                    return {
                      role: roleMatch[2],
                      content: contentMatch[2].replace(/\\n/g, '\n').replace(/\\"/g, '"'),  // エスケープ文字を処理
                      timestamp: Date.now()
                    }
                  }
                  return null
                })
                .filter((msg: any) => msg !== null)

              console.log('パース済みメッセージ:', {
                messageCount: messages.length,
                messages
              })

              if (messages.length > 0) {
                return await this.handleFunctionCall({
                  name: 'updateSessionSummary',
                  arguments: {
                    summary: summary.replace(/\\n/g, '\n').replace(/\\"/g, '"'),  // サマリーのエスケープ文字も処理
                    messages
                  }
                })
              }
            } else {
              console.warn('パターンマッチング失敗:', {
                hasSummaryMatch: !!summaryMatch,
                hasMessagesMatch: !!messagesMatch,
                code
              })
            }
            return null
          } catch (error) {
            console.error('セッションサマリーの処理エラー:', error)
            return null
          }
        }

        if (functionCall.functionCall) {
          result = await this.handleFunctionCall(functionCall.functionCall)
        } else if (functionCall.executableCode) {
          const code = functionCall.executableCode.code
          
          if (code.includes('updateSessionSummary')) {
            while (retryCount < maxRetries) {
              result = await processUpdateSessionSummary(code)
              if (result) break
              
              retryCount++
              if (retryCount < maxRetries) {
                console.log(`セッションサマリーの更新を再試行 (${retryCount}/${maxRetries})`)
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
              }
            }
            
            if (!result) {
              console.warn(`セッションサマリーの更新が${maxRetries}回失敗しました`)
            }
          } else if (code.includes('searchNearbyPlaces')) {
            const match = code.match(/searchNearbyPlaces\(([^)]+)\)/)
            if (match) {
              const argsStr = match[1]
              const args = argsStr.split(',').reduce((acc: any, curr: string) => {
                const [key, value] = curr.split('=')
                acc[key.trim()] = value.trim().replace(/['"]/g, '')
                return acc
              }, {})
              result = await this.handleSearchNearbyPlaces(args)
            }
          } else if (code.includes('translateText')) {
            const match = code.match(/translateText\(([^)]+)\)/)
            if (match) {
              const argsStr = match[1]
              const args: { [key: string]: string } = {}
              const argMatches = argsStr.matchAll(/(\w+)=["']([^"']+)["']/g)
              for (const argMatch of argMatches) {
                const [_, key, value] = argMatch
                args[key] = value
              }
              result = await this.handleTranslateText(args)
            }
          } else if (code.includes('getDirections')) {
            const match = code.match(/getDirections\(([^)]+)\)/)
            if (match) {
              const argsStr = match[1]
              const args: { [key: string]: string } = {}
              const argMatches = argsStr.matchAll(/(\w+)=["']([^"']+)["']/g)
              for (const argMatch of argMatches) {
                const [_, key, value] = argMatch
                args[key] = value
              }
              result = await this.handleGetDirections(args)
            }
          }
        }

        if (!result) {
          console.warn('Function Callの結果が空です')
          return
        }

        // 結果の処理
        if (result.places) {
          // 検索結果の処理（既存のコード）
          if (this.messageCallback) {
            this.messageCallback({
              id: uuidv4(),
              role: 'places',
              content: '',
              places: result.places,
              totalResults: result.totalResults,
              keyword: result.searchMetadata?.keyword || '',
              timestamp: Date.now(),
              turnComplete: false
            })
          }

          // Geminiに渡すメッセージを作成（より簡潔な説明を要求）
          const content = {
            clientContent: {
              turns: [{
                role: 'user',
                parts: [{
                  text: `以下の検索結果について、評価の高い場所や特徴的な場所、ユーザーの要件に合った場所を3件程度、簡潔に紹介してください：
                  ${JSON.stringify({
                    places: result.places.map((place: any) => ({
                      name: place.name,
                      rating: place.rating,
                      distance: Math.round(place.distance)
                    }))
                  }, null, 2)}`
                }]
              }],
              turnComplete: true
            }
          }

          // Geminiに送信
          if (this.ws) {
            this.ws.send(JSON.stringify(content))
          }
        } else if (result.details) {
          // 施設詳細の処理
          const details = result.details
          const content = `${details.name}の詳細情報：\n\n` +
            `📍 住所: ${details.address}\n` +
            (details.rating ? `⭐ 評価: ${details.rating} (${details.userRatingsTotal}件の評価)\n` : '') +
            (details.phoneNumber ? `📞 電話: ${details.phoneNumber}\n` : '') +
            (details.website ? `🌐 ウェブサイト: ${details.website}\n` : '') +
            (details.isOpen !== undefined ? `🕒 ${details.isOpen ? '現在営業中' : '営業時間外'}\n` : '') +
            (details.openingHours ? `\n営業時間:\n${details.openingHours.join('\n')}\n` : '') +
            (details.googleMapsUrl ? `\nGoogle Maps: ${details.googleMapsUrl}` : '')

          if (this.messageCallback) {
            this.messageCallback({
              id: uuidv4(),
              role: 'assistant',
              content: content,
              timestamp: Date.now(),
              turnComplete: true
            })
          }
        } else if (result.routes) {
          // 経路案内の処理
          const route = result.routes[0]
          
          // 経路情報を地図表示用のメッセージとして送信
          if (this.messageCallback) {
            this.messageCallback({
              id: uuidv4(),
              role: 'route',
              content: '',
              timestamp: Date.now(),
              turnComplete: true,
              route: route
            })
          }

          // Geminiに経路情報を送信して説明を要求
          const routeDescription = {
            clientContent: {
              turns: [{
                role: 'user',
                parts: [{
                  text: `以下の経路について、重要なポイントや注意点を簡潔に説明してください。途中ランドマークやスポットがあれば紹介してください。\n` +
                    `・総距離: ${route.distance.text}\n` +
                    `・所要時間: ${route.duration.text}\n` +
                    (route.fare ? `・運賃: ${route.fare.text}\n` : '') +
                    `\n主な経路：\n` +
                    route.steps.map((step: any, index: number) => {
                      if (step.transit_details) {
                        return `${step.transit_details.line.name || step.transit_details.line.short_name}` +
                          `（${step.transit_details.departure_stop.name}から${step.transit_details.arrival_stop.name}）`
                      }
                      return step.instructions.replace(/<[^>]*>/g, '')
                    }).join('\n')
                }]
              }],
              turnComplete: true
            }
          }

          if (this.ws) {
            this.ws.send(JSON.stringify(routeDescription))
          }
        } else if (result.success) {
          // セッションサマリーの処理
          //console.log('セッションサマリーを更新しました:', result)
        }
      } catch (error) {
        console.error('Function Call処理エラー:', error)
        if (this.errorCallback) {
          this.errorCallback('情報の取得に失敗しました')
        }
        if (this.messageCallback) {
          this.messageCallback({
            id: this.currentMessageId || uuidv4(),
            role: 'assistant',
            content: '申し訳ありません。情報の取得中にエラーが発生しました。',
            timestamp: Date.now(),
            turnComplete: true
          })
        }
      }
    }

    // テキスト部分の処理
    const textPart = parts.find((part: any) => part.text)
    if (textPart && this.messageCallback) {
      if (!this.isGenerating) {
        this.isGenerating = true
        this.currentResponse = ''
        this.currentMessageId = uuidv4()
      }
      this.currentResponse += textPart.text

      // 途中経過のメッセージを送信
      this.messageCallback({
        id: this.currentMessageId || uuidv4(),
        role: 'assistant',
        content: this.currentResponse,
        timestamp: Date.now(),
        turnComplete: false
      })
    }

    // オーディオ部分の処理
    const audioPart = parts.find((part: any) => part.inlineData && part.inlineData.mimeType === 'audio/pcm;rate=24000')
    if (audioPart && this.audioStreamer) {
      try {
        // Base64デコード
        const binaryString = atob(audioPart.inlineData.data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        
        // PCMデータをオーディオストリーマーに送信
        this.audioStreamer.addPCM16(bytes)
      } catch (error) {
        console.error('オーディオデータの処理エラー:', error)
      }
    }
  }

  private async handleTurnComplete() {
    if (this.isGenerating && this.messageCallback) {
      try {
        console.log('ターン完了、音声合成を開始:', { textLength: this.currentResponse.length })
        
        // 完全なメッセージを送信
        this.messageCallback({
          id: this.currentMessageId || uuidv4(),
          role: 'assistant',
          content: this.currentResponse,
          timestamp: Date.now(),
          turnComplete: true
        })

        // 完全なテキストで音声を合成
        const response = await fetch('/api/speech/synthesize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: this.currentResponse }),
        })

        if (!response.ok) {
          throw new Error('音声合成に失敗しました')
        }

        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)
        
        // 音声の再生が終わったらURLを解放
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl)
        }
        
        await audio.play()
        console.log('音声再生完了')
      } catch (error) {
        console.error('音声処理エラー:', error)
        if (this.errorCallback) {
          this.errorCallback('音声の再生に失敗しました')
        }
      } finally {
        // 状態をリセット
        this.resetState()
      }
    }
  }

  private resetState() {
    this.currentResponse = ''
    this.isGenerating = false
    this.currentMessageId = null
  }

  setVideoStream(stream: MediaStream | null) {
    this.currentVideoStream = stream
    if (stream) {
      // ビデオストリームの処理を開始
      this.startVideoProcessing(stream)
    } else {
      // ビデオストリームの処理を停止
      this.stopVideoProcessing()
    }
  }

  setAudioStream(stream: MediaStream | null) {
    this.currentAudioStream = stream
    if (stream) {
      // オーディオストリームの処理を開始
      this.startAudioProcessing(stream)
    } else {
      // オーディオストリームの処理を停止
      this.stopAudioProcessing()
    }
  }

  private startVideoProcessing(stream: MediaStream) {
    const videoTrack = stream.getVideoTracks()[0];

    // キャンバスの設定
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', {
      willReadFrequently: true,
      alpha: false
    });
    
    if (!ctx) {
      console.error('Canvas 2D contextの取得に失敗しました');
      return;
    }

    // 既存のビデオ要素を探す
    const existingVideo = document.querySelector('video');
    if (!existingVideo) {
      console.error('ビデオ要素が見つかりません');
      return;
    }

    let animationFrameId: number | null = null;
    let isCapturing = false;
    let lastCaptureTime = 0;
    const captureInterval = 2000; // 2秒ごとにキャプチャ（初期設定）

    const captureFrame = async () => {
      // ストリームとビデオ要素の状態を確認
      if (!this.currentVideoStream || 
          !existingVideo || 
          !existingVideo.srcObject || 
          existingVideo.readyState < existingVideo.HAVE_CURRENT_DATA) {
        console.log('ビデオストリームが利用できないか、準備ができていません');
        cleanup();
        return;
      }

      const now = Date.now();
      if (!isCapturing && now - lastCaptureTime >= captureInterval) {
        try {
          isCapturing = true;

          // 適切なアスペクト比を維持しながらサイズを調整
          const maxWidth = 640;  // 最大幅
          const maxHeight = 480; // 最大高さ
          let targetWidth = existingVideo.videoWidth;
          let targetHeight = existingVideo.videoHeight;

          // アスペクト比を維持しながらリサイズ
          if (targetWidth > maxWidth) {
            const ratio = maxWidth / targetWidth;
            targetWidth = maxWidth;
            targetHeight = Math.round(targetHeight * ratio);
          }
          if (targetHeight > maxHeight) {
            const ratio = maxHeight / targetHeight;
            targetHeight = maxHeight;
            targetWidth = Math.round(targetWidth * ratio);
          }

          // キャンバスのサイズを設定
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          // ビデオフレームをキャンバスに描画（スムージングを有効化）
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(existingVideo, 0, 0, targetWidth, targetHeight);

          try {
            // 高品質なJPEG形式でエンコード
            const base64 = canvas.toDataURL('image/jpeg', 1.0);
            const data = base64.slice(base64.indexOf(',') + 1);
            
            // データを送信
            await this.sendRealtimeInput(data, 'video');
            lastCaptureTime = now;

            // キャプチャ間隔を動的に調整（処理時間に基づいて）
            const processingTime = Date.now() - now;
            const newInterval = Math.max(2000, processingTime * 2); // 最小2秒
            if (newInterval !== captureInterval) {
              console.log('キャプチャ間隔を調整:', {
                processingTime,
                newInterval
              });
            }

          } catch (e) {
            console.error('フレーム送信エラー:', e);
          }
        } catch (error) {
          console.error('フレームのキャプチャに失敗:', error);
        } finally {
          isCapturing = false;
        }
      }

      // 次のフレームをスケジュール
      if (this.videoProcessor) {
        animationFrameId = requestAnimationFrame(captureFrame);
      }
    };

    // クリーンアップ用の関数を定義
    const cleanup = () => {
      console.log('ビデオ処理をクリーンアップします');
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      this.videoProcessor = null;
    };

    // トラックの終了とページの離脱を監視
    videoTrack.addEventListener('ended', cleanup);
    window.addEventListener('beforeunload', cleanup);

    // 初期化
    console.log('フレームキャプチャを開始します:', {
      videoWidth: existingVideo.videoWidth,
      videoHeight: existingVideo.videoHeight,
      captureInterval
    });

    this.videoProcessor = {
      cleanup,
      canvas,
      existingVideo
    };
    animationFrameId = requestAnimationFrame(captureFrame);
  }

  private stopVideoProcessing() {
    if (this.videoProcessor) {
      this.videoProcessor.cleanup();
      this.videoProcessor = null;
    }
  }

  private startAudioProcessing(stream: MediaStream) {
    const audioContext = new AudioContext({
      sampleRate: 16000,
      latencyHint: 'interactive'
    })
    const source = audioContext.createMediaStreamSource(stream)
    const processor = audioContext.createScriptProcessor(4096, 1, 1)

    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0)
      // PCMデータをWebSocketで送信
      this.sendRealtimeInput(this.float32ArrayToBase64(inputData), 'audio');
    }

    source.connect(processor)
    processor.connect(audioContext.destination)
    this.audioProcessor = { context: audioContext, processor }
  }

  private stopAudioProcessing() {
    if (this.audioProcessor) {
      this.audioProcessor.processor.disconnect()
      this.audioProcessor.context.close()
      this.audioProcessor = null
    }
  }

  private float32ArrayToBase64(array: Float32Array): string {
    const buffer = new ArrayBuffer(array.length * 2)
    const view = new DataView(buffer)
    for (let i = 0; i < array.length; i++) {
      view.setInt16(i * 2, array[i] * 0x7FFF, true)
    }
    const bytes = new Uint8Array(buffer)
    return btoa(String.fromCharCode.apply(null, Array.from(bytes)))
  }

  private async sendRealtimeInput(data: string, type: 'video' | 'audio') {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket connection is not open')
      return
    }

    const message = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: type === 'video' ? 'image/jpeg' : 'audio/pcm;rate=16000',
            data: data
          }
        ]
      }
    }

    this.ws.send(JSON.stringify(message))
  }

  async loadPreviousSessionSummary(): Promise<string | null> {
    try {
      const history = await this.sessionMemory.getSessionHistory(1)
      if (history.length > 0 && history[0].summary) {
        return history[0].summary
      }
      return null
    } catch (error) {
      console.error('セッション履歴の読み込みに失敗しました:', error)
      return null
    }
  }

  async completeCurrentSession(): Promise<void> {
    try {
      await this.sessionMemory.summarizeAndCompleteSession()
    } catch (error) {
      console.error('セッションの完了に失敗しました:', error)
      throw error
    }
  }

  // Function Callingのハンドラーを追加
  private async handleFunctionCall(functionCall: any) {
    try {
      const { name, arguments: args } = functionCall

      switch (name) {
        case 'searchNearbyPlaces':
          return await this.handleSearchNearbyPlaces(args)
        case 'getDirections':
          return await this.handleGetDirections(args)
        case 'translateText':
          return await this.handleTranslateText(args)
        case 'updateSessionSummary':
          const { user } = this.getUser()
          if (user && args.summary && args.messages) {
            const sessionDoc = {
              userId: user.uid,
              summary: args.summary,
              messages: args.messages.map((msg: any) => ({
                ...msg,
                timestamp: msg.timestamp || Date.now()
              })),
              timestamp: Date.now(),
              type: 'session_summary'
            }

            // メモリに保存
            await this.memoryManager.addMemory(user.uid, {
              type: 'conversation',
              summary: args.summary,
              details: {
                type: 'session_summary',
                timestamp: Date.now(),
                messages: sessionDoc.messages
              },
            })

            // Firestoreに保存
            const firestoreClient = new FirestoreClient()
            await firestoreClient.addDocument('session_summaries', sessionDoc)
            console.log('セッションサマリーを保存しました:', sessionDoc)
            return { success: true, summary: args.summary }
          }
          return { success: false, error: 'Invalid arguments or no user' }
        default:
          throw new Error(`Unknown function: ${name}`)
      }
    } catch (error) {
      console.error('Function call error:', error)
      throw error
    }
  }

  private async handleSearchNearbyPlaces(args: any) {
    const { keyword, radius = 1000, language = 'ja', locationQuery } = args
    try {
      let location

      if (locationQuery) {
        // 場所名から位置情報を取得
        const geocodeResponse = await fetch('/api/geocode', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ address: locationQuery }),
        })

        if (!geocodeResponse.ok) {
          throw new Error('指定された場所が見つかりませんでした')
        }

        const geocodeResult = await geocodeResponse.json()
        location = geocodeResult.location
      } else {
        // 現在位置を取得
        location = await this.getCurrentLocation()
      }

      const response = await fetch('/api/places/nearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword,
          radius,
          language,
          location
        }),
      })

      if (!response.ok) {
        throw new Error('近隣施設の検索に失敗しました')
      }

      return await response.json()
    } catch (error) {
      console.error('近隣施設の検索エラー:', error)
      throw error
    }
  }

  private getCurrentLocation(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.error('位置情報の取得に失敗しました:', error)
          reject(error)
        }
      )
    })
  }

  // 翻訳関連のハンドラーを追加
  private async handleTranslateText(args: any) {
    const { text, targetLanguage, sourceLanguage } = args
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          targetLanguage,
          sourceLanguage
        }),
      })

      if (!response.ok) {
        throw new Error('翻訳に失敗しました')
      }

      const result = await response.json()

      // チャットオーバーレイに翻訳結果を表示
      if (this.messageCallback) {
        this.messageCallback({
          id: uuidv4(),
          role: 'assistant',
          content: `翻訳結果:\n${result.translatedText}`,
          timestamp: Date.now(),
          turnComplete: false
        })
      }

      // Geminiに翻訳結果を送信
      if (this.ws) {
        const content = {
          clientContent: {
            turns: [{
              role: 'user',
              parts: [{
                text: `翻訳結果を確認して、必要に応じて補足説明をしてください：\n${result.translatedText}`
              }]
            }],
            turnComplete: true
          }
        }
        this.ws.send(JSON.stringify(content))
      }

      return result
    } catch (error) {
      console.error('翻訳エラー:', error)
      throw error
    }
  }

  private async handleGetDirections(args: any) {
    try {
      const location = await this.getCurrentLocation()
      
      const response = await fetch('/api/directions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin: location,
          destination: args.destination,
          mode: args.mode || 'walking'
        }),
      })

      if (!response.ok) {
        throw new Error('経路の取得に失敗しました')
      }

      const result = await response.json()
      console.log('Directions API response:', result) // デバッグログを追加
      
      if (this.messageCallback) {
        this.messageCallback({
          id: uuidv4(),
          role: 'route',
          content: '',
          timestamp: Date.now(),
          turnComplete: true,
          route: result.routes[0] // この部分のデータ構造を確認
        })

        // Geminiに経路情報を送信して説明を要求
        const routeDescription = {
          clientContent: {
            turns: [{
              role: 'user',
              parts: [{
                text: `以下の経路について、重要なポイントや注意点を簡潔に説明してください：\n` +
                  `・総距離: ${result.routes[0].distance.text}\n` +
                  `・所要時間: ${result.routes[0].duration.text}`
              }]
            }],
            turnComplete: true
          }
        }

        if (this.ws) {
          this.ws.send(JSON.stringify(routeDescription))
        }
      }

      return result
    } catch (error) {
      console.error('経路取得エラー:', error)
      throw error
    }
  }

  // ユーザー情報を取得
  getUser() {
    return {
      user: this.user
    }
  }

  // メモリマネージャーを取得
  getMemoryManager() {
    return this.memoryManager
  }

  // 現在のメモリを取得
  getMemories() {
    return this.memories
  }
}

class AudioStreamer {
  private audioQueue: Float32Array[] = []
  private isPlaying: boolean = false
  private sampleRate: number = 24000
  private bufferSize: number = 4096
  private processingBuffer: Float32Array = new Float32Array(0)
  private scheduledTime: number = 0
  private gainNode: GainNode
  private isStreamComplete: boolean = false
  private checkInterval: number | null = null
  private initialBufferTime: number = 0.1

  constructor(private context: AudioContext) {
    this.gainNode = this.context.createGain()
    this.gainNode.gain.value = 1.0
    this.gainNode.connect(this.context.destination)
    console.log('AudioStreamerが初期化されました')
  }

  addPCM16(chunk: Uint8Array) {
    const float32Array = new Float32Array(chunk.length / 2)
    const dataView = new DataView(chunk.buffer)

    for (let i = 0; i < chunk.length / 2; i++) {
      try {
        const int16 = dataView.getInt16(i * 2, true)
        float32Array[i] = int16 / 32768.0
      } catch (e) {
        console.error('PCMデータの変換エラー:', e)
      }
    }

    const newBuffer = new Float32Array(
      this.processingBuffer.length + float32Array.length
    )
    newBuffer.set(this.processingBuffer)
    newBuffer.set(float32Array, this.processingBuffer.length)
    this.processingBuffer = newBuffer

    while (this.processingBuffer.length >= this.bufferSize) {
      const buffer = this.processingBuffer.slice(0, this.bufferSize)
      this.audioQueue.push(buffer)
      this.processingBuffer = this.processingBuffer.slice(this.bufferSize)
    }

    if (!this.isPlaying) {
      console.log('オーディオ再生を開始します')
      this.isPlaying = true
      this.scheduledTime = this.context.currentTime + this.initialBufferTime
      this.scheduleNextBuffer()
    }
  }

  private createAudioBuffer(audioData: Float32Array): AudioBuffer {
    const audioBuffer = this.context.createBuffer(1, audioData.length, this.sampleRate)
    const channelData = audioBuffer.getChannelData(0)
    channelData.set(audioData)
    return audioBuffer
  }

  private scheduleNextBuffer() {
    if (this.audioQueue.length === 0) {
      if (this.isStreamComplete) {
        console.log('オーディオストリームが完了しました')
        this.isPlaying = false
        return
      }

      // キューが空の場合は少し待って再試行
      if (this.checkInterval === null) {
        this.checkInterval = window.setInterval(() => {
          if (this.audioQueue.length > 0) {
            window.clearInterval(this.checkInterval!)
            this.checkInterval = null
            this.scheduleNextBuffer()
          }
        }, 100)
      }
      return
    }

    const audioData = this.audioQueue.shift()!
    const audioBuffer = this.createAudioBuffer(audioData)
    const source = this.context.createBufferSource()
    source.buffer = audioBuffer
    source.connect(this.gainNode)

    source.onended = () => {
      this.scheduleNextBuffer()
    }

    const startTime = Math.max(this.scheduledTime, this.context.currentTime)
    source.start(startTime)
    this.scheduledTime = startTime + audioBuffer.duration
  }

  completeStream() {
    this.isStreamComplete = true
    if (!this.isPlaying && this.audioQueue.length > 0) {
      this.scheduleNextBuffer()
    }
  }

  setVolume(volume: number) {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume))
    }
  }

  stop() {
    this.isPlaying = false
    this.isStreamComplete = true
    this.audioQueue = []
    this.processingBuffer = new Float32Array(0)
    if (this.checkInterval !== null) {
      window.clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }
} 