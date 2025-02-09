import { db } from './firebase'
import { collection, addDoc, query, where, orderBy, limit as firestoreLimit, getDocs, updateDoc, doc } from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid'

export interface SessionContext {
  sessionId: string
  userId: string
  startTime: number
  lastUpdateTime: number
  status: 'active' | 'completed' | 'transferred'
  context: {
    location?: {
      lat: number
      lng: number
      address: string
    }
    searchResults?: Array<{
      placeId: string
      name: string
      address: string
      rating?: number
      photos?: string[]
    }>
    userPreferences?: {
      [key: string]: any
    }
    reservationDetails?: {
      date?: string
      time?: string
      numberOfPeople?: number
      specialRequests?: string
    }
  }
}

export class SessionManager {
  private readonly COLLECTION_NAME = 'sessions'

  async createSession(userId: string): Promise<string> {
    try {
      const sessionId = uuidv4()
      const session: SessionContext = {
        sessionId,
        userId,
        startTime: Date.now(),
        lastUpdateTime: Date.now(),
        status: 'active',
        context: {}
      }

      await addDoc(collection(db, this.COLLECTION_NAME), session)
      return sessionId
    } catch (error) {
      console.error('セッション作成エラー:', error)
      throw error
    }
  }

  async updateContext(sessionId: string, contextUpdate: Partial<SessionContext['context']>): Promise<void> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('sessionId', '==', sessionId),
        firestoreLimit(1)
      )
      const snapshot = await getDocs(q)
      
      if (!snapshot.empty) {
        const sessionDoc = snapshot.docs[0]
        await updateDoc(doc(db, this.COLLECTION_NAME, sessionDoc.id), {
          context: {
            ...sessionDoc.data().context,
            ...contextUpdate
          },
          lastUpdateTime: Date.now()
        })
      }
    } catch (error) {
      console.error('コンテキスト更新エラー:', error)
      throw error
    }
  }

  async getSessionContext(sessionId: string): Promise<SessionContext | null> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('sessionId', '==', sessionId),
        firestoreLimit(1)
      )
      const snapshot = await getDocs(q)
      
      if (!snapshot.empty) {
        return snapshot.docs[0].data() as SessionContext
      }
      return null
    } catch (error) {
      console.error('セッション取得エラー:', error)
      throw error
    }
  }

  async transferSession(sessionId: string, transferType: 'reservation' | 'support'): Promise<void> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('sessionId', '==', sessionId),
        firestoreLimit(1)
      )
      const snapshot = await getDocs(q)
      
      if (!snapshot.empty) {
        const sessionDoc = snapshot.docs[0]
        await updateDoc(doc(db, this.COLLECTION_NAME, sessionDoc.id), {
          status: 'transferred',
          transferType,
          transferTime: Date.now()
        })
      }
    } catch (error) {
      console.error('セッション転送エラー:', error)
      throw error
    }
  }

  async getRecentSessions(userId: string, limit: number = 5): Promise<SessionContext[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('lastUpdateTime', 'desc'),
        firestoreLimit(limit)
      )
      const snapshot = await getDocs(q)
      
      return snapshot.docs.map(doc => doc.data() as SessionContext)
    } catch (error) {
      console.error('セッション履歴取得エラー:', error)
      throw error
    }
  }
} 