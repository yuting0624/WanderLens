import { db } from './firebase'
import { collection, addDoc, query, where, getDocs, updateDoc, doc, DocumentData } from 'firebase/firestore'
import { SessionContext } from './session'

export interface ReservationRequest {
  id?: string
  sessionId: string
  userId: string
  placeId: string
  placeName: string
  date: string
  time: string
  numberOfPeople: number
  specialRequests?: string
  status: 'pending' | 'confirmed' | 'failed' | 'cancelled'
  agentNotes?: string
}

export class ReservationManager {
  private readonly COLLECTION_NAME = 'reservations'

  async createReservationRequest(
    sessionContext: SessionContext,
    request: Omit<ReservationRequest, 'status' | 'sessionId' | 'userId'>
  ): Promise<string> {
    try {
      const reservationRequest: ReservationRequest = {
        ...request,
        sessionId: sessionContext.sessionId,
        userId: sessionContext.userId,
        status: 'pending'
      }

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), reservationRequest)
      return docRef.id
    } catch (error) {
      console.error('予約リクエスト作成エラー:', error)
      throw error
    }
  }

  async updateReservationStatus(
    reservationId: string,
    status: ReservationRequest['status'],
    agentNotes?: string
  ): Promise<void> {
    try {
      await updateDoc(doc(db, this.COLLECTION_NAME, reservationId), {
        status,
        agentNotes,
        lastUpdateTime: Date.now()
      })
    } catch (error) {
      console.error('予約ステータス更新エラー:', error)
      throw error
    }
  }

  async getReservationsByUser(userId: string): Promise<ReservationRequest[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId)
      )
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<ReservationRequest, 'id'>)
      }))
    } catch (error) {
      console.error('予約履歴取得エラー:', error)
      throw error
    }
  }

  async getReservationsBySession(sessionId: string): Promise<ReservationRequest[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('sessionId', '==', sessionId)
      )
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<ReservationRequest, 'id'>)
      }))
    } catch (error) {
      console.error('セッション予約取得エラー:', error)
      throw error
    }
  }

  async addAgentNote(reservationId: string, note: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, reservationId)
      await updateDoc(docRef, {
        agentNotes: note,
        lastUpdateTime: Date.now()
      })
    } catch (error) {
      console.error('エージェントノート追加エラー:', error)
      throw error
    }
  }
} 