import { create } from 'zustand'
import type { MultimodalState, MultimodalStore, MultimodalMessage } from '../types/multimodal'
import { MultimodalClient } from '../utils/multimodal'
import { FirestoreClient } from '../utils/firestore'
import { MemoryManagerImpl } from '../utils/memory'
import { MemoryUpdate } from '../types/memory'
import { VertexAIClient } from '../utils/vertex-ai'

const firestoreClient = new FirestoreClient()
const memoryManager = new MemoryManagerImpl()

const initialState: MultimodalState = {
  messages: [],
  isLoading: false,
  error: null,
  isConnected: false,
  firestoreClient,
  sessionReport: null
}

export const useMultimodalStore = create<MultimodalStore>((set, get) => {
  let client: MultimodalClient | null = null
  let unsubscribeSessionSummary: (() => void) | null = null

  const setupSessionSummaryListener = async (userId: string) => {
    if (unsubscribeSessionSummary) {
      unsubscribeSessionSummary()
    }

    unsubscribeSessionSummary = firestoreClient.listenToCollection(
      'session_summaries',
      async (snapshot: { docs: Array<{ data: () => any; id: string }> }) => {
        const latestSummary = snapshot.docs
          .filter(doc => doc.data().userId === userId)
          .sort((a, b) => b.data().timestamp - a.data().timestamp)[0]

        if (latestSummary) {
          const data = latestSummary.data()
          
          // 最新のセッションサマリーのみを処理（3分以内に作成されたもの）
          const threeMinutesAgo = Date.now() - 3 * 60 * 1000
          if (data.timestamp > threeMinutesAgo) {
            try {
              // サーバーサイドでレポートを生成
              const response = await fetch('/api/generate-report', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  summary: data.summary,
                  messages: data.messages
                })
              })

              if (!response.ok) {
                throw new Error('レポート生成に失敗しました')
              }

              const sessionReport = await response.json()

              set(state => ({
                state: {
                  ...state.state,
                  sessionReport: {
                    ...sessionReport,
                    id: latestSummary.id,
                    userId: data.userId
                  }
                }
              }))
            } catch (error) {
              console.error('セッションレポートの生成に失敗しました:', error)
            }
          }
        }
      }
    )
  }

  return {
    state: initialState,
    addMessage: async (message: MultimodalMessage) => {
      set((state) => ({
        state: {
          ...state.state,
          messages: [...state.state.messages, message]
        }
      }))

      // メッセージの種類に応じてメモリを更新
      const client = get().getClient()
      const { user } = client.getUser()
      
      if (user && message.role !== 'user') {
        let memoryUpdate: MemoryUpdate | null = null

        if (message.role === 'places' && message.places) {
          memoryUpdate = {
            type: 'place',
            summary: '',
            details: message.places.map(place => ({
              name: place.name,
              address: place.address,
              rating: place.rating,
              openNow: place.openNow,
              location: place.location
            })),
            location: message.places[0]?.location
          }
        } else if (message.role === 'route' && message.route) {
          const legs = message.route.legs?.[0]
          if (legs) {  // legsが存在する場合のみメモリを作成
            memoryUpdate = {
              type: 'route',
              summary: `${legs.distance?.text || '不明'} - ${legs.duration?.text || '不明'}`,
              details: {
                duration: legs.duration?.text || '不明',
                distance: legs.distance?.text || '不明',
                steps: legs.steps?.map((step: { instructions?: string; distance?: { text: string }; duration?: { text: string } }) => ({
                  instructions: step.instructions || '',
                  distance: step.distance?.text || '不明',
                  duration: step.duration?.text || '不明'
                })) || []
              }
            }
          }
        } else if (message.role === 'assistant' && message.content) {
          // 重要な情報を含む会話のみを保存
          if (message.content.includes('おすすめ') || 
              message.content.includes('注目') || 
              message.content.includes('人気') ||
              message.content.includes('有名')) {
            memoryUpdate = {
              type: 'conversation',
              summary: '',
              details: {
                content: message.content,
                timestamp: message.timestamp,
                context: get().state.messages
                  .slice(-5)
                  .map(msg => ({
                    role: msg.role,
                    content: msg.content
                  }))
              }
            }
          }
        }

        if (memoryUpdate) {
          try {
            await client.getMemoryManager().addMemory(user.uid, memoryUpdate)
          } catch (error) {
            console.error('メモリの更新に失敗しました:', error)
          }
        }
      }

      try {
        await firestoreClient.saveMessage(message)
      } catch (error) {
        console.error('メッセージの保存に失敗しました:', error)
      }
    },
    setLoading: (loading: boolean) =>
      set((state) => ({
        state: {
          ...state.state,
          isLoading: loading,
        },
      })),
    setError: (error: Error | null) =>
      set((state) => ({
        state: {
          ...state.state,
          error,
        },
      })),
    setConnected: (connected: boolean) =>
      set((state) => ({
        state: {
          ...state.state,
          isConnected: connected,
        },
      })),
    clearMessages: () =>
      set((state) => ({
        state: {
          ...state.state,
          messages: [],
        },
      })),
    connect: async () => {
      if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEYが設定されていません')
      }

      // 初期化時にセッションレポートをクリア
      set(state => ({
        state: {
          ...state.state,
          sessionReport: null
        }
      }))

      client = new MultimodalClient(process.env.NEXT_PUBLIC_GEMINI_API_KEY)
      
      client.onMessage((message) => {
        get().addMessage(message)
        get().setLoading(false)
      })

      client.onError((error) => {
        get().setError(new Error(error))
        get().setLoading(false)
        get().setConnected(false)
      })

      await client.connect()
      
      // セッションサマリーリスナーを設定
      const { user } = client.getUser()
      if (user) {
        await setupSessionSummaryListener(user.uid)
      }
      
      get().setConnected(true)
      get().setError(null)
    },
    disconnect: async () => {
      if (client) {
        // セッションサマリーの生成
        try {
          const messages = get().state.messages
          if (messages.length > 0) {
            // 直接summaryを生成して保存
            const relevantMessages = messages
              .filter(msg => msg.role === 'user' || msg.role === 'assistant')
              .map(msg => ({
                role: msg.role,
                content: msg.content
              }));

            // 並行して実行
            const [summaryPromise, disconnectPromise] = await Promise.all([
              // サマリー生成と保存
              (async () => {
                const summaryPrompt = `# Command: Generate Session Summary

IMPORTANT: Execute ONLY the updateSessionSummary function. NO other text or explanation needed.

Input: Conversation history below
Output: Python function call ONLY

Required format:
default_api.updateSessionSummary(
    messages=[
        default_api.UpdatesessionsummaryMessages(role="user", content="message1"),
        default_api.UpdatesessionsummaryMessages(role="assistant", content="message2")
    ],
    summary="Brief summary of the conversation focusing on user interests and key points"
)

Guidelines:
1. Keep original message content exactly as is
2. Create a concise summary (1-2 sentences)
3. DO NOT modify or omit any messages
4. DO NOT add any explanation, additional text or audio message

Conversation History:
${relevantMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Execute function now:`;

                await client.sendMessage(summaryPrompt);
                // より長いタイムアウトを設定
                await new Promise(resolve => setTimeout(resolve, 40000));
              })(),
              // 切断処理の準備
              (async () => {
                await new Promise(resolve => setTimeout(resolve, 40000));
                client.disconnect();
                client = null;
              })()

            ]);
          }
        } catch (error) {
          console.error('セッションサマリーの生成に失敗しました:', error);
        } finally {
          get().setConnected(false);
        }
      }
    },
    sendMessage: async (message: string, media?: { type: string; data: string }) => {
      if (!client) {
        throw new Error('クライアントが初期化されていません')
      }
      const mediaFile = media ? [new File([Buffer.from(media.data, 'base64')], 'media', { type: media.type })] : undefined
      await client.sendMessage(message, mediaFile)
    },
    getClient: () => client,
    loadMessages: async (limit = 100) => {
      try {
        set((state) => ({
          state: {
            ...state.state,
            isLoading: true,
          },
        }))
        const messages = await firestoreClient.getMessages(limit)
        set((state) => ({
          state: {
            ...state.state,
            messages,
            isLoading: false,
          },
        }))
      } catch (error) {
        console.error('Error loading messages:', error)
        set((state) => ({
          state: {
            ...state.state,
            isLoading: false,
          },
        }))
      }
    },
    deleteMessage: async (messageId: string) => {
      try {
        await firestoreClient.deleteMessage(messageId)
        set((state) => ({
          state: {
            ...state.state,
            messages: state.state.messages.filter(msg => msg.id !== messageId),
          },
        }))
      } catch (error) {
        console.error('Error deleting message:', error)
      }
    },
    getUserMemories: async () => {
      const { user } = await get().getClient()
      if (!user) return []
      return memoryManager.getMemories(user.uid)
    },
    deleteMemory: async (memoryId: string) => {
      const { user } = await get().getClient()
      if (!user) return
      await memoryManager.deleteMemory(user.uid, memoryId)
    },
    // Function calling用の関数
    updateSessionSummary: async ({ summary, messages }: { summary: string, messages: { role: string, content: string }[] }) => {
      const client = get().getClient()
      const { user } = client.getUser()
      
      if (user) {
        const memoryUpdate = {
          type: 'conversation' as const,
          summary,
          details: {
            type: 'session_summary',
            timestamp: Date.now(),
            messages
          }
        }
        
        try {
          // メモリマネージャーに保存
          await client.getMemoryManager().addMemory(user.uid, memoryUpdate)
          
          // Firestoreに直接保存
          const sessionDoc = {
            userId: user.uid,
            summary,
            messages,
            timestamp: Date.now(),
            type: 'session_summary'
          }
          await firestoreClient.addDocument('session_summaries', sessionDoc)
        } catch (error) {
          console.error('セッションサマリーの保存に失敗しました:', error)
        }
      }
    },
    refreshSession: async () => {
      if (client) {
        await client.disconnect()
        client = null
        await get().connect()
      }
    },
    clearSessionReport: () => {
      set(state => ({
        state: {
          ...state.state,
          sessionReport: null
        }
      }))
    }
  }
}) 