import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('auth')
  const { pathname } = request.nextUrl

  // 認証が必要なパス
  const protectedPaths = ['/chat']
  
  // 認証ページへのリダイレクトが必要かチェック
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))

  if (isProtectedPath && !authCookie) {
    const url = new URL('/auth', request.url)
    return NextResponse.redirect(url)
  }

  // 既に認証済みの場合、auth ページにアクセスしたらチャットページにリダイレクト
  if (pathname === '/auth' && authCookie) {
    const url = new URL('/chat', request.url)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/chat/:path*', '/auth']
} 