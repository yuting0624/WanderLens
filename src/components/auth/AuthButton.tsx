import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/store/auth'
import { LogIn, LogOut, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

export function AuthButton() {
  const { state, signIn, signOut } = useAuthStore()
  const router = useRouter()

  const baseButtonClasses = "rounded-full bg-black/40 backdrop-blur-sm border-0 transition-all duration-300 text-white/80 hover:text-white hover:bg-white/20"

  const handleSignIn = async () => {
    try {
      await signIn()
      router.push('/auth/transition')
    } catch (error) {
      console.error('Authentication error:', error)
    }
  }

  if (state.loading) {
    return (
      <Button disabled variant="ghost" size="sm" className={baseButtonClasses}>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    )
  }

  if (state.user) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => signOut()}
        className={cn(baseButtonClasses, "gap-2")}
      >
        <LogOut className="w-4 h-4" />
        ログアウト
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSignIn}
      className={cn(baseButtonClasses, "gap-2")}
    >
      <LogIn className="w-4 h-4" />
      ログイン
    </Button>
  )
} 