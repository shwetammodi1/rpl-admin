import { useEffect, useState } from 'hono/jsx'
import Icon from '../components/Icon'
import { DAYS_SHORT, fmt12, ymd, mondayOf } from '../lib/timetable'

// Downloadable attendance + lesson-log report. Faculty see their own; admins
// (hr/master) see everyone with an optional faculty filter.

type Row = {
  log_date: string
  status: string
  present_count: number | null
  total_count: number | null
  topic: string | null
  remarks: string | null
  present_students: string | null
  day: number
  start_time: string
  end_time: string
  course: string | null
  semester: string | null
  section: string | null
  subject: string | null
  faculty: string | null
  room: string | null
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('rpl_token') ?? ''
  return { Authorization: `Bearer ${token}` }
}

export default function LogReport({ admin = false }: { admin?: boolean }) {
  const today = ymd(new Date())
  const [from, setFrom] = useState(() => ymd(mondayOf(0)))
  const [to, setTo] = useState(() => {
    const d = mondayOf(0); d.setDate(d.getDate() + 6); return ymd(d)
  })
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [facultyFilter, setFacultyFilter] = useState('')

  const load = () => {
    setLoading(true)
    const qs = new URLSearchParams({ from, to })
    if (admin && facultyFilter) qs.set('facultyId', facultyFilter)
    fetch(`/api/timetable/logs?${qs}`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json<{ logs: Row[] }>() : { logs: [] }))
      .then((d) => setRows(d.logs ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const setToday = () => { setFrom(today); setTo(today) }
  const setThisWeek = () => {
    const m = mondayOf(0); const s = new Date(m); s.setDate(s.getDate() + 6)
    setFrom(ymd(m)); setTo(ymd(s))
  }
  const setThisMonth = () => {
    const d = new Date()
    setFrom(ymd(new Date(d.getFullYear(), d.getMonth(), 1)))
    setTo(ymd(new Date(d.getFullYear(), d.getMonth() + 1, 0)))
  }

  // Admin faculty filter options derived from what's loaded
  const facultyNames = [...new Set(rows.map((r) => r.faculty).filter(Boolean) as string[])]
  const view = admin && facultyFilter ? rows.filter((r) => r.faculty === facultyFilter) : rows

  const pctOf = (r: Row) =>
    r.total_count && r.total_count > 0 && r.present_count != null
      ? Math.round((r.present_count / r.total_count) * 100)
      : null

  const download = () => {
    const head = ['Date', 'Day', 'Time', 'Faculty', 'Subject', 'Class', 'Room', 'Status', 'Present', 'Total', '%', 'Topic Taught', 'Present Students', 'Remarks']
    const lines = [head, ...view.map((r) => [
      r.log_date, DAYS_SHORT[r.day - 1] ?? '', `${fmt12(r.start_time)}-${fmt12(r.end_time)}`,
      r.faculty ?? '', r.subject ?? '', [r.course, r.semester, r.section].filter(Boolean).join(' '),
      r.room ?? '', r.status, r.present_count ?? '', r.total_count ?? '',
      pctOf(r) != null ? `${pctOf(r)}%` : '', r.topic ?? '',
      (r.present_students ?? '').replace(/\n/g, '; '), r.remarks ?? '',
    ])]
    const csv = lines.map((l) => l.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `lesson-log_${from}_to_${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="tt-week">
      <section className="admin-card tt-toolbar">
        <div className="tt-toggle">
          <button type="button" className="tt-toggle-btn" onClick={setToday}>Today</button>
          <button type="button" className="tt-toggle-btn" onClick={setThisWeek}>This Week</button>
          <button type="button" className="tt-toggle-btn" onClick={setThisMonth}>This Month</button>
        </div>
        <label className="tt-tb-field"><span>From</span>
          <input type="date" value={from} onInput={(e) => setFrom((e.target as HTMLInputElement).value)} /></label>
        <label className="tt-tb-field"><span>To</span>
          <input type="date" value={to} onInput={(e) => setTo((e.target as HTMLInputElement).value)} /></label>
        {admin && (
          <label className="tt-tb-field"><span>Faculty</span>
            <select value={facultyFilter} onChange={(e) => setFacultyFilter((e.target as HTMLSelectElement).value)}>
              <option value="">All Faculty</option>
              {facultyNames.map((f) => <option key={f}>{f}</option>)}
            </select></label>
        )}
        <div className="tt-tb-spacer" />
        <button type="button" className="tt-today-btn" onClick={load}>Show</button>
        <button type="button" className="btn-primary tt-file-btn" onClick={download} disabled={view.length === 0}>
          <Icon name="download" size={15} /> Download CSV
        </button>
      </section>

      <section className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">Lesson Log &amp; Attendance</h3>
          <span className="tt-chip">{view.length} lectures</span>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th><th>Time</th>{admin && <th>Faculty</th>}<th>Subject</th>
                <th>Class</th><th>Status</th><th>Present</th><th>%</th><th>Topic Taught</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={admin ? 9 : 8} className="tt-empty">Loading…</td></tr>}
              {!loading && view.length === 0 && (
                <tr><td colSpan={admin ? 9 : 8} className="tt-empty">Is range me koi log nahi. Faculty attendance/topic save karega tab yahan aayega.</td></tr>
              )}
              {!loading && view.map((r, i) => (
                <tr key={i}>
                  <td>{r.log_date}<small class="tt-td-dim"> {DAYS_SHORT[r.day - 1]}</small></td>
                  <td>{fmt12(r.start_time)}</td>
                  {admin && <td>{r.faculty ?? '—'}</td>}
                  <td>{r.subject ?? '—'}</td>
                  <td>{[r.course, r.semester, r.section].filter(Boolean).join(' ') || '—'}</td>
                  <td><span className={`tt-status is-${r.status === 'cancelled' ? 'upcoming' : 'completed'}`}>{r.status === 'cancelled' ? 'Cancelled' : 'Conducted'}</span></td>
                  <td>{r.present_count ?? '—'}{r.total_count ? ` / ${r.total_count}` : ''}</td>
                  <td>{pctOf(r) != null ? `${pctOf(r)}%` : '—'}</td>
                  <td>{r.topic || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
