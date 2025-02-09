export interface UserProfile {
  userId: string
  displayName: string | null
  email: string | null
  photoURL: string | null
  preferences: {
    language: string
    interests: string[]
    travelStyle?: 'luxury' | 'budget' | 'adventure' | 'cultural'
    foodPreferences?: string[]
  }
  lastActive: number
}

export interface UserContext {
  profile: UserProfile | null
  recentLocations: {
    lat: number
    lng: number
    address: string
    timestamp: number
  }[]
  recentTopics: string[]
  sessionHistory: {
    sessionId: string
    summary: string
    timestamp: number
  }[]
} 