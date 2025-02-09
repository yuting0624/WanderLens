import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/contexts/auth-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WanderLens - AI powered travel companion",
  description: "Natural conversation, scene recognition to support your travel",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <AuthProvider>
          <main className="min-h-screen bg-background">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
