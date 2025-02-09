import { collection, addDoc, query, orderBy, limit as firestoreLimit, getDocs, deleteDoc, doc, Firestore, serverTimestamp, getFirestore, onSnapshot } from 'firebase/firestore'
import { MultimodalMessage } from '../types/multimodal'
import { db, firebaseApp } from './firebase'

export class FirestoreClient {
  private db: Firestore
  private readonly COLLECTION_NAME = 'chat_history'

  constructor() {
    this.db = getFirestore(firebaseApp)
  }

  async saveMessage(message: MultimodalMessage): Promise<void> {
    try {
      const messageData = {
        ...message,
        timestamp: Date.now(),
      }
      // メディアデータが大きすぎる場合は保存しない
      if (messageData.media?.[0]?.data && messageData.media[0].data.length > 1024 * 1024) {
        delete messageData.media
      }
      await addDoc(collection(this.db, this.COLLECTION_NAME), messageData)
    } catch (error) {
      console.error('Error saving message to Firestore:', error)
      throw error
    }
  }

  async getMessages(messageLimit: number = 100): Promise<MultimodalMessage[]> {
    try {
      const q = query(
        collection(this.db, this.COLLECTION_NAME),
        orderBy('timestamp', 'desc'),
        firestoreLimit(messageLimit)
      )
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MultimodalMessage[]
    } catch (error) {
      console.error('Error getting messages from Firestore:', error)
      throw error
    }
  }

  async deleteMessage(messageId: string): Promise<void> {
    try {
      await deleteDoc(doc(this.db, this.COLLECTION_NAME, messageId))
    } catch (error) {
      console.error('Error deleting message from Firestore:', error)
      throw error
    }
  }

  async addDocument(collectionName: string, data: any): Promise<void> {
    try {
      const collectionRef = collection(db, collectionName)
      await addDoc(collectionRef, {
        ...data,
        createdAt: serverTimestamp()
      })
    } catch (error) {
      console.error('ドキュメントの追加に失敗しました:', error)
      throw error
    }
  }

  listenToCollection(collectionName: string, callback: (snapshot: any) => void) {
    const q = query(collection(this.db, collectionName), orderBy('timestamp', 'desc'), firestoreLimit(1))
    return onSnapshot(q, callback)
  }
} 