export interface UserProfile {
  id: string
  username: string
  displayName: string
  email: string
  roles: string[]
  themePreference?: string | null
}

export interface LoginResponse {
  token: string
  user: UserProfile
}
