export interface UserProfile {
  id: string
  username: string
  displayName: string
  email: string
  roles: string[]
}

export interface LoginResponse {
  token: string
  user: UserProfile
}
