'use client'

import { useState, useEffect } from 'react'
import { useMultimodalStore } from '@/lib/store/multimodal'
import { Button } from '@/components/ui/button'
import { Wifi, WifiOff, Loader2, X, Camera, Sparkles, MessageSquare, Navigation } from 'lucide-react'
import { CameraView } from '@/components/media/CameraView'
import { ControlBar } from '@/components/media/ControlBar'
import { ChatInput } from './ChatInput'
import { v4 as uuidv4 } from 'uuid'
import { motion, AnimatePresence } from 'framer-motion'
import { ScrollArea } from '../ui/scroll-area'
import { PlaceResults } from '../places/PlaceResults'
import { type MultimodalMessage } from '@/lib/types/multimodal'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'
import { CameraOverlay } from '../media/CameraOverlay'
import { Sparkles as SparklesComponent } from '@/components/ui/sparkles'
import { AnimatedText } from '@/components/ui/animated-text'
import Image from 'next/image'
import Loader from '../ui/loader'
import { SessionReportCard } from '../reports/SessionReportCard'
const DynamicMap = dynamic(() => import('@/components/DirectionsMap'), {
  ssr: false,
})

interface LiveMessage {
  id: string
  content: string
  timestamp: number
}

export function ChatContainer() {
  const {
    state,
    addMessage,
    setLoading,
    setError,
    connect,
    disconnect,
    sendMessage,
    getClient,
    clearSessionReport
  } = useMultimodalStore()

  const [isVideoEnabled, setIsVideoEnabled] = useState(false)
  const [isAudioEnabled, setIsAudioEnabled] = useState(false)
  const [isChatVisible, setIsChatVisible] = useState(false)
  const [isInputVisible, setIsInputVisible] = useState(false)
  const [liveMessages, setLiveMessages] = useState<LiveMessage[]>([])
  const [previousSessionSummary, setPreviousSessionSummary] = useState<string | null>(null)
  const [latestMessage, setLatestMessage] = useState<MultimodalMessage | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const assistantMessages = state.messages
      .filter(msg => msg.role === 'assistant' && typeof msg.content === 'string')
      .map(msg => ({
        id: msg.id || uuidv4(),
        content: msg.content!,
        timestamp: msg.timestamp || Date.now()
      }))
    setLiveMessages(assistantMessages)
  }, [state.messages])

  useEffect(() => {
    const loadPreviousSession = async () => {
      const client = getClient()
      if (client) {
        const summary = await client.loadPreviousSessionSummary()
        if (summary) {
          setPreviousSessionSummary(summary)
          addMessage({
            id: uuidv4(),
            role: 'assistant',
            content: summary,
            timestamp: Date.now(),
            turnComplete: true
          })
        }
      }
    }
    loadPreviousSession()
  }, [getClient, addMessage])

  useEffect(() => {
    if (state.messages.length > 0) {
      const lastMessage = state.messages[state.messages.length - 1]
      if (lastMessage.role === 'route' || lastMessage.role === 'places' || lastMessage.role === 'assistant') {
        setLatestMessage(lastMessage)
      }
    }
  }, [state.messages])

  const handleConnect = async () => {
    try {
      setLoading(true)
      setError(null)
      await connect()
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Connection failed'))
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      setIsSaving(true)
      const client = getClient()
      if (client) {
        await client.completeCurrentSession()
      }
      // カメラ、マイク、チャットをオフにする
      setIsVideoEnabled(false)
      setIsAudioEnabled(false)
      setIsChatVisible(false)
      setIsInputVisible(false)
      handleVideoStreamChange(null)
      handleAudioStreamChange(null)
      await disconnect()
      setIsSaving(false)
    } catch (error) {
      console.error('Session completion error:', error)
      await disconnect()
    } finally {
      setIsSaving(false)
    }
  }

  const handleSend = async (message: string, media?: File[]) => {
    try {
      setLoading(true)
      setError(null)

      if (!state.isConnected) {
        throw new Error('APIに接続されていません。接続ボタンを押してください。')
      }

      const messageId = uuidv4()
      addMessage({
        id: messageId,
        role: 'user',
        content: message,
        timestamp: Date.now(),
        turnComplete: true
      })

      if (media && media.length > 0) {
        // ファイルをbase64に変換
        const mediaData = await Promise.all(
          media.map(async (file) => {
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader()
              reader.onload = () => {
                const base64 = reader.result as string
                resolve(base64.split(',')[1])
              }
              reader.readAsDataURL(file)
            })
            return {
              type: file.type.startsWith('image/') ? 'image' as const : 'video' as const,
              data: base64
            }
          })
        )
        await sendMessage(message, mediaData[0])
      } else {
        await sendMessage(message)
      }
    } catch (error) {
      setError(error instanceof Error ? error : new Error('通信エラーが発生しました'))
    } finally {
      setLoading(false)
    }
  }

  const handleVideoStreamChange = (stream: MediaStream | null) => {
    const client = getClient()
    if (client) {
      client.setVideoStream(stream)
    }
  }

  const handleAudioStreamChange = (stream: MediaStream | null) => {
    const client = getClient()
    if (client) {
      client.setAudioStream(stream)
    }
  }

  const handleChatToggle = () => {
    if (!state.isConnected) return
    
    if (isChatVisible) {
      setIsChatVisible(false)
      setIsInputVisible(false)
    } else {
      setIsChatVisible(true)
      setIsInputVisible(true)
    }
  }

  const handleClearLatestMessage = () => {
    setLatestMessage(null)
  }

  return (
    <div className="relative flex flex-col h-full">
      <div className="relative w-full h-full bg-gradient-to-br from-gray-900 to-gray-800">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-safe-area left-1/2 -translate-x-1/2 z-50"
        >
          <Button
            variant="ghost"
            size="lg"
            onClick={state.isConnected ? handleDisconnect : handleConnect}
            disabled={state.isLoading || isSaving}
            className={cn(
              "rounded-full backdrop-blur-sm border transition-all duration-300 min-w-[160px]",
              "hover:scale-105 active:scale-95",
              state.isLoading && "animate-pulse",
              state.isConnected 
                ? "bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400 hover:text-red-300"
                : "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 text-blue-400 hover:text-blue-300"
            )}
          >
            {isSaving ? (
              <div className="flex flex-col items-center justify-center w-full">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>保存中...</span>
                </div>
                <span className="text-[10px] opacity-60">会話履歴を保存しています</span>
              </div>
            ) : state.isLoading ? (
              <div className="flex items-center justify-center gap-2 w-full">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>接続中...</span>
              </div>
            ) : state.isConnected ? (
              <div className="flex items-center justify-center gap-2 w-full">
                <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                <WifiOff className="w-4 h-4" />
                <span>切断する</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 w-full">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse opacity-50" />
                <Wifi className="w-4 h-4" />
                <span>接続する</span>
              </div>
            )}
          </Button>
        </motion.div>

        <div className="absolute inset-0 z-0">
          <CameraView
            mode="translation"
            isStreaming={isVideoEnabled}
            onStreamChange={handleVideoStreamChange}
            overlayContent={
              (isVideoEnabled || latestMessage?.role === 'route' || latestMessage?.role === 'places') ? (
                <CameraOverlay
                  message={latestMessage}
                  isVisible={true}
                  onClose={handleClearLatestMessage}
                />
              ) : null
            }
          />
          {!isVideoEnabled && !latestMessage && (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800">
              <div className="h-full flex flex-col items-center justify-start p-6 max-w-2xl mx-auto text-center pt-safe-area">
                {/* ロゴ部分 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-12 sm:mt-16 relative z-10"
                >
                  <SparklesComponent color="#88ccff" className="mb-6">
                    <AnimatedText
                      text="WanderLens"
                      className="text-4xl sm:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-indigo-400 text-transparent bg-clip-text"
                    />
                  </SparklesComponent>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-lg sm:text-xl text-blue-200"
                  >
                    Geminiによる次世代旅行コンパニオン
                  </motion.p>
                </motion.div>

                {/* 使い方の説明（未接続時のみ表示） */}
                {!state.isConnected && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="grid gap-6 w-full max-w-md mt-8"
                  >
                    <div className="relative group">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
                      <div className="relative bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 border border-white/10 transition-all duration-300 hover:bg-gray-900/60">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
                            <Camera className="w-5 h-5" />
                          </div>
                          <div className="flex-1 text-left">
                            <h3 className="font-medium text-white/90">カメラを起動</h3>
                            <p className="text-sm text-gray-400 mt-0.5">周辺の景色をAIが認識して情報を提供</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="relative group">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
                      <div className="relative bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 border border-white/10 transition-all duration-300 hover:bg-gray-900/60">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
                            <MessageSquare className="w-5 h-5" />
                          </div>
                          <div className="flex-1 text-left">
                            <h3 className="font-medium text-white/90">AIとチャット</h3>
                            <p className="text-sm text-gray-400 mt-0.5">周辺のスポットなど、気軽に質問</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="relative group">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
                      <div className="relative bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 border border-white/10 transition-all duration-300 hover:bg-gray-900/60">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
                            <Navigation className="w-5 h-5" />
                          </div>
                          <div className="flex-1 text-left">
                            <h3 className="font-medium text-white/90">ナビゲーション</h3>
                            <p className="text-sm text-gray-400 mt-0.5">目的地までの歩行ルートを案内</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 接続を促すメッセージ（未接続時のみ表示） */}
                {!state.isConnected && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mt-8 text-blue-200 flex items-center gap-2"
                  >
                    <span>上部の「接続する」をタップして始めよう</span>
                  </motion.div>
                )}

                {/* 接続時のローダー */}
                {state.isConnected && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex flex-col items-center justify-center"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 blur-3xl rounded-full transform -translate-y-8" />
                      <Loader />
                    </div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="mt-8"
                    >
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 blur-lg rounded-lg" />
                        <p className="relative text-xl font-medium text-blue-300">AIアシスタントの準備完了</p>
                      </div>
                      <p className="text-sm text-blue-200/60">
                        マイクを起動するか、チャットで質問してください
                        <span className="inline-block ml-2 animate-pulse">✨</span>
                      </p>
                    </motion.div>
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </div>

        <AnimatePresence>
          {isInputVisible && !isChatVisible && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute bottom-24 left-0 right-0 z-40"
            >
              <div className="bg-gradient-to-t from-black/80 via-black/60 to-transparent pt-8 pb-4 px-4">
                <div className="max-w-3xl mx-auto">
                  <ChatInput 
                    onSend={handleSend} 
                    isLoading={state.isLoading}
                    onClose={() => {
                      setIsInputVisible(false)
                      setIsChatVisible(false)
                    }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <ControlBar
          isVideoEnabled={isVideoEnabled}
          isAudioEnabled={isAudioEnabled}
          isConnected={state.isConnected}
          onVideoToggle={() => {
            if (!state.isConnected) return
            setIsVideoEnabled(!isVideoEnabled)
          }}
          onAudioToggle={async () => {
            if (!state.isConnected) return
            const newState = !isAudioEnabled
            setIsAudioEnabled(newState)
            if (newState) {
              try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                handleAudioStreamChange(stream)
              } catch (error) {
                console.error('Failed to start microphone:', error)
                setIsAudioEnabled(false)
              }
            } else {
              handleAudioStreamChange(null)
            }
          }}
          onChatToggle={handleChatToggle}
        />

        <AnimatePresence>
          {isChatVisible && (
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute inset-0 z-30"
            >
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-6 right-6 z-50"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsChatVisible(false);
                    setIsInputVisible(false);
                  }}
                  className="rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white border border-white/10 w-10 h-10"
                >
                  <X className="w-5 h-5" />
                </Button>
              </motion.div>

              <div className="h-full bg-gradient-to-b from-black/60 via-black/40 to-transparent backdrop-blur-[2px]">
                <div className="flex flex-col h-full">
                  <ScrollArea className="flex-1 mt-16">
                    <div className="space-y-4 max-w-3xl mx-auto p-4 pb-40">
                      {state.messages.map((message, index) => {
                        if (message.role === 'route' && message.route) {
                          const prevMessage = index > 0 ? state.messages[index - 1] : null;
                          if (prevMessage?.role === 'route') {
                            return null;
                          }

                          const route = message.route;
                          // ルートデータを適切な形式に変換
                          const routeInfo = {
                            distance: route.distance || { text: '不明' },
                            duration: route.duration || { text: '不明' },
                            steps: route.steps?.map((step: {
                              distance?: { text: string };
                              duration?: { text: string };
                              instructions?: string;
                              polyline?: { points: string };
                            }) => ({
                              distance: step.distance || { text: '不明' },
                              duration: step.duration || { text: '不明' },
                              instructions: step.instructions || '',
                              polyline: step.polyline || { points: '' }
                            })) || [],
                            overview_polyline: route.overview_polyline || { points: '' }
                          };

                          return (
                            <motion.div
                              key={message.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="w-full rounded-2xl overflow-hidden shadow-lg relative"
                            >
                              {/* 地図用の閉じるボタン */}
                              <div className="absolute top-4 right-4 z-10">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleClearLatestMessage()}
                                  className="rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white border border-white/10 w-8 h-8"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                              <DynamicMap 
                                route={routeInfo}
                                origin=""
                                destination=""
                              />
                            </motion.div>
                          )
                        }

                        if (message.role === 'places' && message.places) {
                          return (
                            <motion.div
                              key={message.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="w-full relative"
                            >
                              {/* 検索結果用の閉じるボタン */}
                              <div className="absolute top-4 right-4 z-10">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleClearLatestMessage()}
                                  className="rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white border border-white/10 w-8 h-8"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                              <PlaceResults
                                places={message.places}
                                totalResults={message.totalResults || 0}
                                keyword={message.keyword || ''}
                              />
                            </motion.div>
                          )
                        }

                        if (message.role === 'user' || message.role === 'assistant') {
                          return (
                            <motion.div
                              key={message.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={cn(
                                'p-4 rounded-2xl max-w-[80%] backdrop-blur-md shadow-lg',
                                message.role === 'user'
                                  ? 'ml-auto bg-blue-500/80 text-white'
                                  : 'bg-black/40 text-white/90'
                              )}
                            >
                              <div className="whitespace-pre-wrap">{message.content}</div>
                            </motion.div>
                          )
                        }

                        return null
                      })}
                    </div>
                  </ScrollArea>
                  <div className="p-4 pb-24">
                    <div className="max-w-3xl mx-auto">
                      <ChatInput 
                        onSend={handleSend} 
                        isLoading={state.isLoading}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Geminiクレジット */}
        {!isVideoEnabled && !latestMessage && (
          <div className="absolute bottom-20 left-0 right-0 z-20 pointer-events-none">
            <div className="flex items-center justify-center gap-2">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex items-center gap-0.1 px-3 py-1.5 rounded-full bg-black/20 backdrop-blur-sm border border-white/10"
              >
                <span className="text-[10px] sm:text-xs text-white/60">Built with</span>
                <div className="relative w-12 sm:w-16 h-3 sm:h-4 -mt-1.5">
                  <Image
                    src="/gemini-logo.png"
                    alt="Gemini"
                    fill
                    sizes="(max-width: 640px) 48px, 64px"
                    className="object-contain"
                    priority
                  />
                </div>
              </motion.div>
            </div>
          </div>
        )}

        {/* セッションレポートの表示（カメラが無効かつツール表示が不要な場合） */}
        {!isVideoEnabled && !latestMessage?.role && state.sessionReport && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <div className="relative w-full max-w-lg mx-auto">
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute -top-2 -right-2 z-10 p-2 rounded-full bg-gray-800/80 text-white/80 hover:bg-gray-700/80 transition-colors"
                onClick={clearSessionReport}
              >
                <X className="w-4 h-4" />
              </motion.button>
              <SessionReportCard report={state.sessionReport} />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}