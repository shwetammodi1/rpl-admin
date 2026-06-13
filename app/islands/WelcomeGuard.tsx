import { useEffect } from 'hono/jsx'

const ROLE_REDIRECTS: Record<string, string> = {
  faculty: '/dashboard',
  hr: '/hr/dashboard',
  master: '/master',
}

export default function WelcomeGuard() {
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

        if (user.role !== 'pending') {
          window.location.href = ROLE_REDIRECTS[user.role] ?? '/dashboard'
          return
        }

        const nameEl = document.getElementById('welcome-firstname')
        if (nameEl) {
          nameEl.textContent = user.name.split(' ')[0]
        }
      })
      .catch(() => {
        window.location.href = '/'
      })
  }, [])

  return null
}
