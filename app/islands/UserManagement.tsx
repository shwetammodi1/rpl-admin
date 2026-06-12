import { useState } from 'hono/jsx'
import type { Role } from '../lib/session'

type AdminUser = {
  id: number
  email: string
  name: string
  role: Role
  created_at: string
}

type Props = {
  users: AdminUser[]
  currentUserId: number
}

export default function UserManagement({ users: initialUsers, currentUserId }: Props) {
  const [users, setUsers] = useState(initialUsers)
  const [error, setError] = useState('')
  const [pendingId, setPendingId] = useState<number | null>(null)

  const updateRole = async (id: number, role: Role) => {
    setError('')
    setPendingId(id)

    const res = await fetch(`/api/users/${id}/role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    const result = await res.json<{ error?: string }>()

    setPendingId(null)

    if (!res.ok) {
      setError(result.error ?? 'Failed to update role')
      return
    }

    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)))
  }

  return (
    <section>
      <h2>User management</h2>
      {error && <p className="form-error">{error}</p>}
      <table className="users-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>
                {u.role === 'master_admin' || u.id === currentUserId ? (
                  <span>—</span>
                ) : u.role === 'admin' ? (
                  <button
                    type="button"
                    className="counter"
                    disabled={pendingId === u.id}
                    onClick={() => updateRole(u.id, 'viewer')}
                  >
                    Revoke admin
                  </button>
                ) : (
                  <button
                    type="button"
                    className="counter"
                    disabled={pendingId === u.id}
                    onClick={() => updateRole(u.id, 'admin')}
                  >
                    Make admin
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
