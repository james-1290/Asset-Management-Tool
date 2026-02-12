export interface UserProfile {
  id: string
  username: string
  displayName: string
  email: string
  roles: string[]
  themePreference?: string | null
  authProvider?: string
}

export interface LoginResponse {
  token: string
  user: UserProfile
}

export interface SsoConfig {
  ssoEnabled: boolean
  ssoUrl?: string | null
  ssoLabel?: string | null
}
