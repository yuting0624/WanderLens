export class AudioBufferManager {
  private buffer: Uint8Array = new Uint8Array(0)
  private readonly minBufferSize: number
  private readonly maxBufferSize: number
  private isProcessing: boolean = false
  private accumulatedTranscription: string = ''

  constructor(
    minBufferSize: number = 192000, // 8秒分のデータ (24kHz * 8)
    maxBufferSize: number = 720000  // 30秒分のデータ
  ) {
    this.minBufferSize = minBufferSize
    this.maxBufferSize = maxBufferSize
  }

  // 新しい音声データを追加
  addChunk(chunk: Uint8Array): void {
    console.log('バッファに新しいチャンクを追加:', chunk.length)
    const newBuffer = new Uint8Array(this.buffer.length + chunk.length)
    newBuffer.set(this.buffer)
    newBuffer.set(chunk, this.buffer.length)
    this.buffer = newBuffer
    console.log('現在のバッファサイズ:', this.buffer.length)
  }

  // バッファが最小サイズを超えているかチェック
  isReadyForProcessing(): boolean {
    const ready = this.buffer.length >= this.minBufferSize && !this.isProcessing
    console.log('処理準備完了:', ready, '(バッファサイズ:', this.buffer.length, ')')
    return ready
  }

  // バッファが最大サイズを超えているかチェック
  isBufferFull(): boolean {
    const full = this.buffer.length >= this.maxBufferSize
    if (full) {
      console.log('バッファが最大サイズに達しました')
    }
    return full
  }

  // 処理用にバッファを取得し、バッファをクリア
  async processBuffer<T>(
    processor: (buffer: Uint8Array) => Promise<T>
  ): Promise<T | null> {
    if (this.buffer.length === 0 || this.isProcessing) {
      console.log('バッファが空か処理中のため、スキップします')
      return null
    }

    try {
      console.log('バッファの処理を開始:', this.buffer.length)
      this.isProcessing = true
      const result = await processor(this.buffer)
      // バッファをクリアする前に、処理結果を確認
      if (result) {
        console.log('処理結果を取得:', result)
      }
      this.buffer = new Uint8Array(0)
      return result
    } catch (error) {
      console.error('バッファ処理エラー:', error)
      throw error
    } finally {
      this.isProcessing = false
      console.log('バッファ処理完了')
    }
  }

  // バッファをクリア
  clear(): void {
    console.log('バッファをクリア')
    this.buffer = new Uint8Array(0)
    this.isProcessing = false
    this.accumulatedTranscription = ''
  }

  // 現在のバッファサイズを取得
  getBufferSize(): number {
    return this.buffer.length
  }
} 