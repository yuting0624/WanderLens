import { Place } from './multimodal'

export interface Memory {
  id: string
  type: 'place' | 'conversation' | 'route'
  summary: string
  details: {
    duration?: string
    distance?: string
    steps?: Array<{
      instructions: string
      distance: string
      duration: string
    }>
  } | any  // 既存の他のタイプとの互換性のため
  timestamp: number
  location?: {
    lat: number
    lng: number
  }
}

export interface UserMemory {
  userId: string
  memories: Memory[]
  lastUpdated: number
}

export interface MemoryUpdate {
  type: Memory['type']
  summary: string
  details: any
  location?: {
    lat: number
    lng: number
  }
}

// メモリ管理のための関数型定義
export interface MemoryManager {
  addMemory: (userId: string, update: MemoryUpdate) => Promise<void>
  getMemories: (userId: string) => Promise<Memory[]>
  deleteMemory: (userId: string, memoryId: string) => Promise<void>
  summarizeContent: (content: string) => Promise<string>
} 