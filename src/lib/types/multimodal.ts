import { MultimodalClient } from '../utils/multimodal'
import { FirestoreClient } from '../utils/firestore'
import { Memory } from './memory'

export interface Place {
  name: string
  rating?: number
  address?: string
  distance: number
  openNow?: boolean
  location?: {
    lat: number
    lng: number
  }
  photos?: Array<{
    photoReference: string
    width: number
    height: number
  }>
}

export type MultimodalMessage = {
  id: string
  role: 'user' | 'assistant' | 'route' | 'places'
  content?: string
  timestamp: number
  turnComplete?: boolean
  route?: any
  places?: any[]
  totalResults?: number
  keyword?: string
  media?: {
    type: 'image' | 'video'
    data: string
  }[]
}

export interface MultimodalResponse {
  message: MultimodalMessage
  suggestions?: string[]
  error?: string
}

export interface MultimodalState {
  messages: MultimodalMessage[]
  isLoading: boolean
  isConnected: boolean
  error: Error | null
  firestoreClient: FirestoreClient
  sessionReport: SessionReport | null
}

export interface MultimodalStore {
  state: MultimodalState
  addMessage: (message: MultimodalMessage) => Promise<void>
  setLoading: (loading: boolean) => void
  setConnected: (connected: boolean) => void
  setError: (error: Error | null) => void
  connect: () => Promise<void>
  disconnect: () => void
  sendMessage: (message: string, media?: { type: string; data: string }) => Promise<void>
  getClient: () => any
  loadMessages: (limit?: number) => Promise<void>
  deleteMessage: (messageId: string) => Promise<void>
  getUserMemories: () => Promise<Memory[]>
  deleteMemory: (memoryId: string) => Promise<void>
  refreshSession: () => Promise<void>
  clearSessionReport: () => void
}

export type MessagePart = {
  text?: string
  image_bytes?: {
    data: string
  }
}

export type ContentMessage = {
  role: 'user' | 'assistant'
  parts: MessagePart[]
}

export interface ClientContent {
  turns: ContentMessage[]
  turnComplete: boolean
}

export interface ServerContent {
  modelTurn?: {
    parts: MessagePart[]
  }
  interrupted?: boolean
  turnComplete?: boolean
}

export interface SetupConfig {
  model: string
  generationConfig: {
    responseModalities: 'text' | 'audio' | 'image'
    candidate_count: number
    stop_sequences: string[]
    temperature: number
    top_k: number
    top_p: number
    max_output_tokens: number
    speechConfig?: {
      voiceConfig?: {
        prebuiltVoiceConfig?: {
          voiceName: string
        }
      }
    }
  }
  systemInstruction?: {
    parts: MessagePart[]
  }
  tools: Array<{ googleSearch: {} } | { functionDeclarations: any[] }>
}

export interface SetupCompleteMessage {
  setupComplete: {}
}

export interface ToolCall {
  functionCalls: {
    name: string
    id: string
    args: any
  }[]
}

export interface ToolResponse {
  functionResponses: {
    response: { output: { success: boolean } }
    id: string
  }[]
}

export type VideoProcessor = {
  cleanup: () => void
  canvas: HTMLCanvasElement
  existingVideo: HTMLVideoElement
}

export type AudioProcessor = {
  context: AudioContext
  processor: ScriptProcessorNode
}

export interface SessionReport {
  id: string
  userId: string
  sessionId: string
  summary: string
  insights: string[]
  recommendations: string[]
  advice: string[]
  timestamp: number
  status: 'pending' | 'completed'
} 