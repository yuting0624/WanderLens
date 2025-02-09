import { cn } from '@/lib/utils'
import { type MultimodalMessage } from '@/lib/types/multimodal'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import Image from 'next/image'
import { User, Bot } from 'lucide-react'

interface ChatMessageProps {
  message: MultimodalMessage
  className?: string
}

export function ChatMessage({ message, className }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'flex items-start gap-2',
        isUser ? 'flex-row-reverse' : 'flex-row',
        className
      )}
    >
      <Avatar className="w-8 h-8">
        <AvatarFallback>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </AvatarFallback>
      </Avatar>
      <Card
        className={cn(
          'max-w-[70%] p-4',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        )}
      >
        <p className="text-sm leading-relaxed">{message.content}</p>
        {message.media && message.media.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.media.map((media, index) => (
              <div key={index} className="relative h-40 w-full overflow-hidden rounded-lg">
                {media.type === 'image' ? (
                  <Image
                    src={`data:image/jpeg;base64,${media.data}`}
                    alt="Uploaded content"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <video
                    src={`data:video/mp4;base64,${media.data}`}
                    controls
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
} 