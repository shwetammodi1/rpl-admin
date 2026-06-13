import { useEffect } from 'hono/jsx'

const ROLE_REDIRECTS: Record<string, string> = {
  pending: '/welcome',
  faculty: '/dashboard',
  hr: '/hr/dashboard',
  master: '/master',
}

type Props = {
  allowedRoles: string[]
}

export default function AuthGuard({ allowedRoles }: Props) {
  useEffect(() => {
    const token = localStorage.getItem('rpl_token')
    if (!token) {
      window.location.href = '/'
      return
    }

    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (!res.ok) {
          localStorage.removeItem('rpl_token')
          window.location.href = '/'
          return
        }

        const user = await res.json<{ name: string; role: string }>()

        if (!allowedRoles.includes(user.role)) {
          window.location.href = ROLE_REDIRECTS[user.role] ?? '/welcome'
          return
        }

        const nameEl = document.getElementById('user-name')
        if (nameEl) {
          nameEl.textContent = user.name
        }
      })
      .catch(() => {
        window.location.href = '/'
      })
  }, [])

  return null
}
