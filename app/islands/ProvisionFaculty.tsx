import { useEffect, useState } from 'hono/jsx'
import Icon from '../components/Icon'

type Account = { name: string; email: string; password: string; status: 'created' | 'updated' | 'kept' }
type Result = { total: number; created: number; updated: number; kept: number; accounts: Account[] }

export default function ProvisionFaculty() {
  const [authChecked, setAuthChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('rpl_token')
    if (!token) {
      window.location.href = '/'
      return
    }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json<{ role: string }>() : null))
      .then((u) => {
        if (!u || u.role !== 'master') {
          window.location.href = '/'
          return
        }
        setAuthChecked(true)
      })
      .catch(() => {
        window.location.href = '/'
      })
  }, [])

  const provision = async () => {
    if (!confirm('Create/refresh login accounts for all faculty? Passwords are shown once — note them down.')) return
    const token = localStorage.getItem('rpl_token')
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/staff/provision', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      })
      const j = (await res.json().catch(() => ({}))) as Result & { error?: string }
      if (!res.ok) {
        setError(j.error ?? `Failed (HTTP ${res.status})`)
        return
      }
      setResult(j)
    } catch {
      setError('Network error — try again.')
    } finally {
      setBusy(false)
    }
  }

  const downloadCsv = () => {
    if (!result) return
    const rows = [['Name', 'Email', 'Password', 'Status']]
    for (const a of result.accounts) rows.push([a.name, a.email, a.password, a.status])
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'faculty-credentials.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (!authChecked) return null

  return (
    <div className="admin-card provision-card">
      <div className="provision-body">
        <p className="provision-intro">
          Yeh sabhi faculty/staff ke liye <b>login accounts</b> banata hai —{' '}
          <b>business email</b> (Name.surname@rplmaheshwari.com), ek <b>unique password</b>, <b>faculty</b> role,
          aur unki designation + degrees. Jinke accounts pehle se set hain unka password nahi badlega.
        </p>

        {!result && (
          <button type="button" className="btn-primary" disabled={busy} onClick={provision}>
            {busy ? 'Provisioning…' : 'Provision Faculty Accounts'}
          </button>
        )}

        {error && (
          <div className="import-alert is-error">
            <Icon name="alert" size={16} /> {error}
          </div>
        )}

        {result && (
          <>
            <div className="import-alert is-success">
              <Icon name="check-circle" size={16} />
              <div>
                <b>Done!</b> {result.total} accounts — {result.created} created, {result.updated} updated,{' '}
                {result.kept} already set.
                <div className="provision-warn">
                  ⚠️ Passwords sirf abhi dikhenge — <b>"Download CSV"</b> karke safe rakho aur faculty ko de do (woh
                  baad me change kar sakte hain).
                </div>
              </div>
            </div>

            <div className="provision-actions">
              <button type="button" className="btn-gold" onClick={downloadCsv}>
                <Icon name="download" size={14} /> Download CSV
              </button>
            </div>

            <div className="provision-table-wrap">
              <table className="provision-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email (login)</th>
                    <th>Password</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.accounts.map((a) => (
                    <tr key={a.email}>
                      <td>{a.name}</td>
                      <td className="provision-mono">{a.email}</td>
                      <td className="provision-mono">{a.password}</td>
                      <td>
                        <span className={`provision-tag is-${a.status}`}>{a.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
