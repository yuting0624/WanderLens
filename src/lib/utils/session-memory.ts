import { db } from './firebase'
import { collection, addDoc, query, where, orderBy, limit as firestoreLimit, getDocs, updateDoc, doc } from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid'
import { auth } from './firebase'
import { type UserProfile } from '../types/profile'

export interface SessionMemory {
  sessionId: string
  userId: string | null
  userProfile?: UserProfile
  messages: {
    role: 'assistant' | 'user'
    content: string
    timestamp: number
    context?: {
      location?: {
        lat: number
        lng: number
        address: string
      }
      topic?: string
      language?: string
    }
  }[]
  summary?: string
  topics?: string[]
  lastUpdateTime: number
  status: 'active' | 'completed'
}

export interface SessionData {
  summary?: string;
  messages: { role: string; content: string }[];
  timestamp: number;
}

export class SessionMemoryManager {
  private readonly COLLECTION_NAME = 'session_memories'
  private currentSessionId: string | null = null
  private userProfile: UserProfile | null = null
  private currentSession: SessionData = {
    messages: [],
    timestamp: Date.now()
  }

  constructor() {
    this.initializeSession()
  }

  setUserProfile(profile: UserProfile) {
    this.userProfile = profile
  }

  private initializeSession() {
    // ローカルストレージからセッションIDを取得
    const storedSessionId = localStorage.getItem('currentSessionId')
    if (storedSessionId) {
      this.currentSessionId = storedSessionId
    } else {
      // 新しいセッションIDを生成
      this.currentSessionId = uuidv4()
      localStorage.setItem('currentSessionId', this.currentSessionId)
    }
    console.log('セッション初期化:', this.currentSessionId)
  }

  async saveAssistantMessage(content: string, context?: SessionMemory['messages'][0]['context']) {
    try {
      if (!this.currentSessionId) {
        throw new Error('セッションIDが設定されていません')
      }

      const userId = auth.currentUser?.uid || null

      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('sessionId', '==', this.currentSessionId),
        firestoreLimit(1)
      )
      const snapshot = await getDocs(q)

      const message = {
        role: 'assistant' as const,
        content,
        timestamp: Date.now(),
        context: context || undefined
      }

      if (snapshot.empty) {
        // 新しいセッションメモリオブジェクトを作成
        const sessionMemory = {
          sessionId: this.currentSessionId,
          userId,
          userProfile: this.userProfile,
          messages: [message],
          lastUpdateTime: Date.now(),
          status: 'active' as const
        }

        // undefinedフィールドを削除
        const cleanedData = Object.entries(sessionMemory)
          .filter(([_, value]) => value !== undefined)
          .reduce((acc, [key, value]) => ({
            ...acc,
            [key]: value
          }), {} as typeof sessionMemory)

        await addDoc(collection(db, this.COLLECTION_NAME), cleanedData)
      } else {
        const sessionDoc = snapshot.docs[0]
        const currentData = sessionDoc.data() as SessionMemory
        await updateDoc(doc(db, this.COLLECTION_NAME, sessionDoc.id), {
          messages: [...currentData.messages, message],
          lastUpdateTime: Date.now()
        })
      }

      console.log('メッセージを保存しました')
    } catch (error) {
      console.error('メッセージの保存に失敗しました:', error)
      throw error
    }
  }

  async getSessionHistory(messageLimit: number = 10): Promise<SessionMemory[]> {
    try {
      const userId = auth.currentUser?.uid || null
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('lastUpdateTime', 'desc'),
        firestoreLimit(messageLimit)
      )
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          ...data,
          userProfile: data.userProfile || null,
          summary: data.summary || null,
          topics: data.topics || []
        } as SessionMemory
      })
    } catch (error) {
      console.error('セッション履歴の取得に失敗しました:', error)
      throw error
    }
  }

  private async generateAISummary(messages: SessionMemory['messages']): Promise<{ summary: string; topics: string[] }> {
    try {
      // 要約生成のためのプロンプトを構築
      const summaryPrompt = {
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          context: msg.context || {}
        })),
        instructions: {
          summary_format: "以下の点を含めて要約を生成してください：\n" +
            "1. 主要な話題と結論\n" +
            "2. ユーザーの具体的な要望や好み\n" +
            "3. 決定された行動や計画\n" +
            "4. 未解決の質問や次回の課題",
          topic_extraction: "以下のカテゴリに基づいてトピックを抽出してください：\n" +
            "- 旅行先\n" +
            "- アクティビティ\n" +
            "- 食事や宿泊\n" +
            "- 予算\n" +
            "- 特別な要望\n" +
            "- 文化や言語"
        }
      }

      const response = await fetch('/api/chat/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(summaryPrompt),
      })

      if (!response.ok) {
        throw new Error('要約の生成に失敗しました')
      }

      const data = await response.json()
      
      // トピックの重要度に基づいてソート
      const sortedTopics = data.topics.sort((a: string, b: string) => {
        const aCount = messages.filter(msg => msg.content.includes(a)).length
        const bCount = messages.filter(msg => msg.content.includes(b)).length
        return bCount - aCount
      })

      return {
        summary: data.summary,
        topics: sortedTopics
      }
    } catch (error) {
      console.error('AI要約生成エラー:', error)
      // フォールバック: 最後の5つのメッセージを使用
      const fallbackSummary = this.generateFallbackSummary(messages)
      return {
        summary: fallbackSummary,
        topics: []
      }
    }
  }

  private generateFallbackSummary(messages: SessionMemory['messages']): string {
    const keyPoints = messages
      .map(msg => msg.content)
      .join('\n')
      .split('\n')
      .filter(line => line.trim().length > 0)
      .slice(-5)
      .join('\n')

    return `前回のセッションの要約:\n${keyPoints}`
  }

  async summarizeAndCompleteSession() {
    try {
      if (!this.currentSessionId) {
        throw new Error('セッションIDが設定されていません')
      }

      const history = await this.getSessionHistory(1)
      if (history.length > 0) {
        const session = history[0]
        const { summary, topics } = await this.generateAISummary(session.messages)

        const q = query(
          collection(db, this.COLLECTION_NAME),
          where('sessionId', '==', this.currentSessionId),
          firestoreLimit(1)
        )
        const snapshot = await getDocs(q)
        
        if (!snapshot.empty) {
          await updateDoc(doc(db, this.COLLECTION_NAME, snapshot.docs[0].id), {
            status: 'completed',
            summary,
            topics,
            lastUpdateTime: Date.now()
          })
        }

        // 新しいセッションを開始
        this.currentSessionId = uuidv4()
        localStorage.setItem('currentSessionId', this.currentSessionId)
      }
    } catch (error) {
      console.error('セッションの完了処理に失敗しました:', error)
      throw error
    }
  }

  async updateSessionSummary(summary: string, messages: { role: string; content: string }[]): Promise<void> {
    this.currentSession = {
      ...this.currentSession,
      summary,
      messages,
      timestamp: Date.now()
    }
  }
} 