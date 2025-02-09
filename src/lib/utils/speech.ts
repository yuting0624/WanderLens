import { SpeechClient } from '@google-cloud/speech'
import { Storage } from '@google-cloud/storage'
import { db } from './firebase'
import { collection, addDoc } from 'firebase/firestore'

interface SpeechRecognitionResult {
  alternatives: {
    transcript: string
    confidence: number
  }[]
}

interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

declare global {
  interface Window {
    webkitSpeechRecognition: any;
  }
}

export class SpeechProcessor {
  private recognition: any;
  private isListening: boolean = false;
  private lastProcessedTime: number = 0;
  private onResultCallback: ((text: string) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.recognition = new window.webkitSpeechRecognition();
      this.initRecognition();
    }
  }

  private initRecognition() {
    if (!this.recognition) return;

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'ja-JP';

    this.recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      if (result.isFinal) {
        const text = result[0].transcript;
        if (this.onResultCallback) {
          this.onResultCallback(text);
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      this.stop();
    };
  }

  public reset() {
    this.isListening = false;
    this.lastProcessedTime = 0;
    if (this.recognition) {
      this.recognition.abort();
      this.initRecognition();
    }
  }

  async processAudioToText(audioData: Uint8Array): Promise<string> {
    try {
      console.log('音声データを文字起こし用に変換:', audioData.length)
      const base64Audio = Buffer.from(audioData).toString('base64')
      
      console.log('文字起こしAPIにリクエスト送信')
      const response = await fetch('/api/speech/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audioData: base64Audio }),
      })

      if (!response.ok) {
        throw new Error('文字起こし処理に失敗しました')
      }

      const data = await response.json()
      console.log('文字起こし結果を受信:', data)
      return data.transcription
    } catch (error) {
      console.error('文字起こしエラー:', error)
      throw error
    }
  }

  async saveAudioAndTranscription(
    audioData: Uint8Array,
    sessionId: string,
    messageId: string,
    transcription: string,
    role: 'user' | 'assistant'
  ): Promise<void> {
    try {
      console.log('文字起こしを保存:', {
        sessionId,
        messageId,
        transcriptionLength: transcription.length,
        role
      })
      
      const response = await fetch('/api/speech/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          messageId,
          transcription,
          role,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('保存APIエラーレスポンス:', errorData)
        throw new Error('文字起こしの保存に失敗しました')
      }

      console.log('保存完了')
    } catch (error) {
      console.error('保存エラー:', error)
      throw error
    }
  }

  public stop() {
    if (this.recognition) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  public start(onResult: (text: string) => void) {
    if (this.recognition && !this.isListening) {
      this.onResultCallback = onResult;
      this.recognition.start();
      this.isListening = true;
    }
  }
} 