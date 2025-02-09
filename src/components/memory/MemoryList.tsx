import { useEffect, useState } from 'react'
import { useMultimodalStore } from '@/lib/store/multimodal'
import { Memory } from '@/lib/types/memory'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

export function MemoryList() {
  const { getUserMemories, deleteMemory } = useMultimodalStore()
  const [memories, setMemories] = useState<Memory[]>([])

  useEffect(() => {
    loadMemories()
  }, [])

  const loadMemories = async () => {
    const userMemories = await getUserMemories()
    setMemories(userMemories)
  }

  const handleDelete = async (memoryId: string) => {
    await deleteMemory(memoryId)
    await loadMemories()
  }

  const renderMemoryContent = (memory: Memory) => {
    switch (memory.type) {
      case 'place':
        return (
          <div className="space-y-2">
            <h4 className="font-medium">{memory.summary}</h4>
            <div className="space-y-1">
              {memory.details.map((place: any, index: number) => (
                <div key={index} className="text-sm">
                  {place.name} - {place.address}
                </div>
              ))}
            </div>
          </div>
        )
      case 'route':
        return (
          <div className="space-y-2">
            <h4 className="font-medium">経路情報</h4>
            <p className="text-sm">{memory.summary}</p>
          </div>
        )
      case 'conversation':
        return (
          <div className="space-y-2">
            <h4 className="font-medium">会話メモ</h4>
            <p className="text-sm">{memory.summary}</p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <ScrollArea className="h-[500px] w-full rounded-md border p-4">
      <div className="space-y-4">
        {memories.map((memory) => (
          <div
            key={memory.id}
            className="flex items-start justify-between space-x-4 rounded-lg border p-4"
          >
            <div className="flex-1">
              {renderMemoryContent(memory)}
              <div className="mt-2 text-xs text-gray-500">
                {new Date(memory.timestamp).toLocaleString()}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(memory.id)}
              className="text-red-500 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
} 