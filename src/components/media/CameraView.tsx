'use client'

import { useRef, useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface CameraViewProps {
  mode: 'translation' | 'landmark' | 'menu'
  overlayContent?: ReactNode
  onStreamChange: (stream: MediaStream | null) => void
  isStreaming: boolean
}

export function CameraView({
  mode,
  overlayContent,
  onStreamChange,
  isStreaming
}: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    let mounted = true;

    const setupCamera = async () => {
      try {
        if (isStreaming) {
          // モバイルデバイスの検出
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          
          // デバイスに応じて最適な設定を選択
          const constraints = {
            video: {
              facingMode: 'environment',
              width: { ideal: isMobile ? 640 : 1280 },
              height: { ideal: isMobile ? 480 : 720 },
              frameRate: { ideal: isMobile ? 15 : 30 },
              // モバイルデバイス向けの追加設定
              ...(isMobile && {
                aspectRatio: { ideal: 4/3 },
                resizeMode: 'crop-and-scale'
              })
            }
          };

          console.log('カメラ設定を使用:', constraints);
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          
          if (!mounted) {
            stream.getTracks().forEach(track => track.stop());
            return;
          }

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            streamRef.current = stream;
            
            // ストリームの準備完了を待つ
            await new Promise<void>((resolve) => {
              if (videoRef.current) {
                videoRef.current.onloadedmetadata = () => {
                  console.log('ビデオストリーム準備完了:', {
                    width: videoRef.current?.videoWidth,
                    height: videoRef.current?.videoHeight
                  });
                  resolve();
                };
              }
            });

            // プレイ開始を確実に
            await videoRef.current.play();
            onStreamChange(stream);
          }
        } else {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            if (videoRef.current) {
              videoRef.current.srcObject = null;
            }
            streamRef.current = null;
            onStreamChange(null);
          }
        }
      } catch (error) {
        console.error('カメラの起動に失敗しました:', error);
        if (mounted) {
          onStreamChange(null);
        }
      }
    };

    setupCamera();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [isStreaming, onStreamChange]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <motion.video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        initial={{ opacity: 0 }}
        animate={{ opacity: isStreaming ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="w-full h-full object-cover"
      />
      {overlayContent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn(
            "absolute inset-0 z-10",
            "bg-gradient-to-b from-black/20 via-transparent to-black/60"
          )}
        >
          {overlayContent}
        </motion.div>
      )}
    </div>
  )
} 