import { useEffect, useState } from 'hono/jsx'
import Icon from '../components/Icon'

// Attendance summary + "what I taught today", saved per lecture per date.
// Embedded inside the lecture modal on the calendar and weekly views.

type Log = {
  status: string
  present_count: number | null
  total_count: number | null
  topic: string | null
  remarks: string | null
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('rpl_token') ?? ''
  return { Authorization: `Bearer ${token}` }
}

export default function LectureLogForm({
  slotId,
  date,
  editable = true,
}: {
  slotId?: string
  date: string
  editable?: boolean
}) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [status, setStatus] = useState('conducted')
  const [present, setPresent] = useState('')
  const [total, setTotal] = useState('')
  const [topic, setTopic] = useState('')
  const [remarks, setRemarks] = useState('')
  const [existing, setExisting] = useState(false)

  useEffect(() => {
    if (!slotId) {
      setLoading(false)
      return
    }
    fetch(`/api/timetable/log?slotId=${encodeURIComponent(slotId)}&date=${date}`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json<{ log: Log | null }>() : null))
      .then((d) => {
        const l = d?.log
        if (l) {
          setExisting(true)
          setStatus(l.status ?? 'conducted')
          setPresent(l.present_count != null ? String(l.present_count) : '')
          setTotal(l.total_count != null ? String(l.total_count) : '')
          setTopic(l.topic ?? '')
          setRemarks(l.remarks ?? '')
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    if (!slotId) return
    setSaving(true)
    setMsg('')
    try {
      const res = await fetch('/api/timetable/log', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId,
          date,
          status,
          presentCount: present === '' ? null : Number(present),
          totalCount: total === '' ? null : Number(total),
          topic,
          remarks,
        }),
      })
      if (res.ok) {
        setExisting(true)
        setMsg('Saved ✓')
      } else if (res.status === 403) {
        setMsg('You can only log your own lectures.')
      } else {
        setMsg('Could not save — try again.')
      }
    } catch {
      setMsg('Network error — try again.')
    } finally {
      setSaving(false)
      setTimeout(() => setMsg(''), 3500)
    }
  }

  if (!slotId) return null
  if (loading) return <div className="tt-log tt-log-loading">Loading lecture log…</div>

  const pct =
    present !== '' && total !== '' && Number(total) > 0
      ? Math.round((Number(present) / Number(total)) * 100)
      : null

  // Read-only summary (e.g. a master viewing someone else's lecture)
  if (!editable) {
    return (
      <div className="tt-log">
        <div className="tt-log-title"><Icon name="check-square" size={14} /> Lecture Log</div>
        {existing ? (
          <dl className="tt-log-ro">
            <div><dt>Status</dt><dd>{status === 'cancelled' ? 'Cancelled' : 'Conducted'}</dd></div>
            <div><dt>Attendance</dt><dd>{present || '—'} / {total || '—'}{pct != null ? ` (${pct}%)` : ''}</dd></div>
            <div><dt>Topic</dt><dd>{topic || '—'}</dd></div>
            {remarks && <div><dt>Remarks</dt><dd>{remarks}</dd></div>}
          </dl>
        ) : (
          <p className="tt-log-empty">No log recorded for this date.</p>
        )}
      </div>
    )
  }

  return (
    <div className="tt-log">
      <div className="tt-log-title">
        <Icon name="check-square" size={14} /> Take Attendance &amp; Lesson Log
        <span className="tt-log-date">{date}</span>
      </div>

      <div className="tt-log-row">
        <label className="tt-tb-field">
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus((e.target as HTMLSelectElement).value)}>
            <option value="conducted">Conducted</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label className="tt-tb-field">
          <span>Present</span>
          <input type="number" min="0" value={present} placeholder="e.g. 52"
            onInput={(e) => setPresent((e.target as HTMLInputElement).value)} />
        </label>
        <label className="tt-tb-field">
          <span>Total</span>
          <input type="number" min="0" value={total} placeholder="e.g. 58"
            onInput={(e) => setTotal((e.target as HTMLInputElement).value)} />
        </label>
        <div className="tt-log-pct">{pct != null ? `${pct}%` : '—'}</div>
      </div>

      <label className="tt-tb-field">
        <span>What did you teach today?</span>
        <input value={topic} placeholder="Topic covered — e.g. Consumer Behaviour, Chapter 4"
          onInput={(e) => setTopic((e.target as HTMLInputElement).value)} />
      </label>
      <label className="tt-tb-field">
        <span>Remarks (optional)</span>
        <input value={remarks} placeholder="Any note about this lecture"
          onInput={(e) => setRemarks((e.target as HTMLInputElement).value)} />
      </label>

      <div className="tt-log-actions">
        <button type="button" className="btn-primary" disabled={saving} onClick={save}>
          <Icon name="check" size={15} /> {saving ? 'Saving…' : existing ? 'Update Log' : 'Save Log'}
        </button>
        {msg && <span className="tt-log-msg">{msg}</span>}
      </div>
    </div>
  )
}
