import { createRoute } from '../../lib/factory'
import SignOutButton from '../../islands/SignOutButton'
import UserManagement from '../../islands/UserManagement'
import type { Role } from '../../lib/session'

export default createRoute(async (c) => {
  const user = c.get('user')
  if (!user) return c.redirect('/signin')

  let users: { id: number; email: string; name: string; role: Role; created_at: string }[] = []
  if (user.role === 'master_admin') {
    const result = await c.env.DB.prepare(
      'SELECT id, email, name, role, created_at FROM users ORDER BY created_at ASC'
    ).all<{ id: number; email: string; name: string; role: Role; created_at: string }>()
    users = result.results
  }

  return c.render(
    <main>
      <h1>Dashboard</h1>
      <p>
        Signed in as <strong>{user.name}</strong> ({user.email}) — role: <strong>{user.role}</strong>
      </p>

      {user.role === 'viewer' && (
        <p>
          You have view-only access. Ask a master admin to grant you admin rights to make
          changes.
        </p>
      )}
      {user.role === 'admin' && <p>You have admin rights and can make changes.</p>}
      {user.role === 'master_admin' && <p>You are the master admin.</p>}

      {user.role === 'master_admin' && <UserManagement users={users} currentUserId={user.sub} />}

      <SignOutButton />
    </main>,
    { title: 'Dashboard - RPL Admin' }
  )
})
