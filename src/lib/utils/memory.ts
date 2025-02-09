import { v4 as uuidv4 } from 'uuid'
import { Memory, MemoryManager, MemoryUpdate } from '../types/memory'
import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'

export class MemoryManagerImpl implements MemoryManager {
  private readonly COLLECTION_NAME = 'userMemories'

  async addMemory(userId: string, update: MemoryUpdate): Promise<void> {
    const memory: Memory = {
      id: uuidv4(),
      ...update,
      timestamp: Date.now()
    }

    const userMemoryRef = doc(db, this.COLLECTION_NAME, userId)

    try {
      const docSnap = await getDoc(userMemoryRef)
      if (docSnap.exists()) {
        // 既存のメモリ配列に追加
        await updateDoc(userMemoryRef, {
          memories: [...docSnap.data()?.memories || [], memory],
          lastUpdated: Date.now()
        })
      } else {
        // 新しいドキュメントを作成
        await setDoc(userMemoryRef, {
          userId,
          memories: [memory],
          lastUpdated: Date.now()
        })
      }
    } catch (error) {
      console.error('メモリの追加に失敗しました:', error)
      throw error
    }
  }

  async getMemories(userId: string): Promise<Memory[]> {
    try {
      const docSnap = await getDoc(doc(db, this.COLLECTION_NAME, userId))
      if (docSnap.exists()) {
        return docSnap.data()?.memories || []
      }
      return []
    } catch (error) {
      console.error('メモリの取得に失敗しました:', error)
      throw error
    }
  }

  async deleteMemory(userId: string, memoryId: string): Promise<void> {
    const userMemoryRef = doc(db, this.COLLECTION_NAME, userId)

    try {
      const docSnap = await getDoc(userMemoryRef)
      if (docSnap.exists()) {
        const memories = docSnap.data()?.memories || []
        const updatedMemories = memories.filter(
          (memory: Memory) => memory.id !== memoryId
        )

        await updateDoc(userMemoryRef, {
          memories: updatedMemories,
          lastUpdated: Date.now()
        })
      }
    } catch (error) {
      console.error('メモリの削除に失敗しました:', error)
      throw error
    }
  }

  async summarizeContent(content: string): Promise<string> {
    return content.length > 100 
      ? `${content.substring(0, 97)}...`
      : content
  }
} 