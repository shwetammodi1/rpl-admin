import { useEffect, useState } from 'hono/jsx'
import Icon from '../components/Icon'

// PHASE 3 — UI only. All data below is static dummy data; Phase 7 replaces it
// with the real API. The only network call is the existing /api/auth/me, used
// just to greet the logged-in faculty by name.

type Lecture = {
  start: string
  end: string
  subject: string
  colour: string
  room: string
  section: string
  type: string
}

const TODAY: Lecture[] = [
  { start: '09:00', end: '10:00', subject: 'Marketing', colour: 'blue', room: 'Room 205', section: 'BBA II A', type: 'Theory' },
  { start: '10:30', end: '11:30', subject: 'Digital Marketing', colour: 'purple', room: 'Room 108', section: 'BBA III B', type: 'Theory' },
  { start: '13:30', end: '14:30', subject: 'Marketing Management', colour: 'orange', room: 'Room 205', section: 'MBA I A', type: 'Theory' },
  { start: '15:00', end: '16:30', subject: 'Computer Lab', colour: 'pink', room: 'Lab 2', section: 'BCA II', type: 'Practical' },
]

const WEEK = [
  { day: 'Mon', count: 5 },
  { day: 'Tue', count: 4 },
  { day: 'Wed', count: 6 },
  { day: 'Thu', count: 3 },
  { day: 'Fri', count: 5 },
  { day: 'Sat', count: 2 },
]

const QUICK = {
  department: 'Commerce & Management',
  workingHours: '09:00 AM – 04:30 PM',
  students: 180,
  effectiveFrom: '01 Jul 2026',
}

const STATS = { lectures: 25, subjects: 6, workingDays: 6, attendance: 94 }

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function fmt12(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hh = h % 12 === 0 ? 12 : h % 12
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`
}

function lectureStatus(l: Lecture, now: number) {
  if (toMinutes(l.end) <= now) return 'completed'
  if (toMinutes(l.start) <= now) return 'ongoing'
  return 'upcoming'
}

function greeting(h: number) {
  if (h < 12) return 'Good Morning'
  if (h < 17) return 'Good Afternoon'
  return 'Good Evening'
}

export default function TimetableDashboard() {
  const [name, setName] = useState('')
  const [now, setNow] = useState(() => {
    const d = new Date()
    return d.getHours() * 60 + d.getMinutes()
  })

  useEffect(() => {
    const token = localStorage.getItem('rpl_token')
    if (token) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json<{ name: string }>() : null))
        .then((u) => u && setName(u.name))
        .catch(() => {})
    }
    const t = setInterval(() => {
      const d = new Date()
      setNow(d.getHours() * 60 + d.getMinutes())
    }, 30000)
    return () => clearInterval(t)
  }, [])

  const next = TODAY.find((l) => lectureStatus(l, now) !== 'completed')
  const remaining = TODAY.filter((l) => lectureStatus(l, now) === 'upcoming').length
  const maxCount = Math.max(...WEEK.map((w) => w.count))
  const firstName = name ? name.replace(/^(Dr\.?|Prof\.?|Mr\.?|Ms\.?|Mrs\.?|Smt\.?|Shri)\s+/i, '').split(' ')[0] : ''

  let countdown = ''
  if (next) {
    const diff = toMinutes(next.start) - now
    if (diff <= 0) countdown = 'In progress'
    else if (diff < 60) countdown = `starts in ${diff} min`
    else countdown = `starts in ${Math.floor(diff / 60)}h ${diff % 60}m`
  }

  return (
    <div className="tt-dash">
      <div className="tt-greet">
        <h2 className="tt-greet-title">
          {greeting(Math.floor(now / 60))}
          {firstName ? `, ${firstName}` : ''}
        </h2>
        <p className="tt-greet-sub">
          {remaining > 0 ? `${remaining} lecture${remaining > 1 ? 's' : ''} remaining today` : 'No more lectures today'}
        </p>
      </div>

      {/* Top summary cards */}
      <section className="admin-stats is-four">
        <div className="admin-stat-card">
          <div className="admin-stat-icon is-navy"><Icon name="table" size={18} /></div>
          <div>
            <div className="admin-stat-value">{STATS.lectures}</div>
            <div className="admin-stat-label">Lectures This Week</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon is-blue"><Icon name="book" size={18} /></div>
          <div>
            <div className="admin-stat-value is-blue">{STATS.subjects}</div>
            <div className="admin-stat-label">Subjects Assigned</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon is-amber"><Icon name="calendar" size={18} /></div>
          <div>
            <div className="admin-stat-value is-amber">{STATS.workingDays}</div>
            <div className="admin-stat-label">Working Days</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon is-present"><Icon name="check-circle" size={18} /></div>
          <div>
            <div className="admin-stat-value is-present">
              {STATS.attendance}
              <span className="admin-stat-suffix">%</span>
            </div>
            <div className="admin-stat-label">Attendance</div>
          </div>
        </div>
      </section>

      {/* Today's schedule + next lecture */}
      <div className="tt-grid">
        <section className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">Today's Schedule</h3>
            <span className="tt-chip">{TODAY.length} lectures</span>
          </div>
          <ol className="tt-timeline">
            {TODAY.map((l) => {
              const st = lectureStatus(l, now)
              return (
                <li className={`tt-tl-item tt-c-${l.colour} is-${st}`} key={l.start}>
                  <div className="tt-tl-time">
                    <span className="tt-tl-start">{fmt12(l.start)}</span>
                    <span className="tt-tl-end">{fmt12(l.end)}</span>
                  </div>
                  <span className="tt-tl-dot" />
                  <div className="tt-tl-card">
                    <div className="tt-tl-head">
                      <span className="tt-tl-subject">{l.subject}</span>
                      <span className={`tt-status is-${st}`}>
                        {st === 'completed' ? 'Completed' : st === 'ongoing' ? 'Ongoing' : 'Upcoming'}
                      </span>
                    </div>
                    <div className="tt-tl-meta">
                      <span><Icon name="building" size={13} /> {l.room}</span>
                      <span><Icon name="users" size={13} /> {l.section}</span>
                      <span><Icon name="file-text" size={13} /> {l.type}</span>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </section>

        <aside className="admin-card tt-next">
          <div className="admin-card-header">
            <h3 className="admin-card-title">Next Lecture</h3>
          </div>
          {next ? (
            <div className={`tt-next-body tt-c-${next.colour}`}>
              <span className="tt-next-badge">{next.type}</span>
              <h4 className="tt-next-subject">{next.subject}</h4>
              <div className="tt-next-time">{fmt12(next.start)} – {fmt12(next.end)}</div>
              <div className="tt-next-countdown">{countdown}</div>
              <dl className="tt-next-meta">
                <div><dt>Room</dt><dd>{next.room}</dd></div>
                <div><dt>Section</dt><dd>{next.section}</dd></div>
              </dl>
              <button type="button" className="btn-primary tt-next-btn">
                <Icon name="check-square" size={15} /> Take Attendance
              </button>
            </div>
          ) : (
            <div className="tt-empty">All lectures for today are done. 🎉</div>
          )}
        </aside>
      </div>

      {/* Weekly summary + quick info */}
      <div className="tt-grid">
        <section className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">Weekly Summary</h3>
            <span className="tt-chip">{STATS.lectures} total</span>
          </div>
          <div className="tt-bars">
            {WEEK.map((w) => (
              <div className="tt-bar-col" key={w.day}>
                <div className="tt-bar-wrap">
                  <div className="tt-bar" style={{ height: `${(w.count / maxCount) * 100}%` }} />
                </div>
                <span className="tt-bar-val">{w.count}</span>
                <span className="tt-bar-day">{w.day}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">Quick Info</h3>
          </div>
          <dl className="tt-quick">
            <div><dt>Faculty</dt><dd>{name || '—'}</dd></div>
            <div><dt>Department</dt><dd>{QUICK.department}</dd></div>
            <div><dt>Working Hours</dt><dd>{QUICK.workingHours}</dd></div>
            <div><dt>Students</dt><dd>{QUICK.students}</dd></div>
            <div><dt>Effective From</dt><dd>{QUICK.effectiveFrom}</dd></div>
          </dl>
        </section>
      </div>
    </div>
  )
}
