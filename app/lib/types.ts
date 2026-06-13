export type Role = 'pending' | 'faculty' | 'hr' | 'master'

export type AuthPayload = {
  userId: string
  role: Role
}
