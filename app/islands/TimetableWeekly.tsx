import { useState } from 'hono/jsx'
import Icon from '../components/Icon'

// PHASE 4 — UI only. Static dummy data; Phase 7 swaps it for the real API.
// Shared by the faculty and master weekly pages — `admin` shows the extra
// faculty/department filters that only an admin needs.

export type Lecture = {
  day: number // 1 = Mon … 7 = Sun
  start: string
  end: string
  subject: string
  colour: string
  room: string
  building: string
  section: string
  semester: string
  type: string
  faculty: string
  department: string
  students: number
  attendance: 'taken' | 'pending' | 'na'
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const SLOTS = [
  { start: '09:00', end: '10:00' },
  { start: '10:00', end: '11:00' },
  { start: '11:00', end: '12:00' },
  { start: '12:00', end: '13:30', lunch: true },
  { start: '13:30', end: '14:30' },
  { start: '14:30', end: '15:30' },
  { start: '15:30', end: '16:30' },
]

const F = 'Devendra Nagwanshi'
const D = 'Commerce & Management'

function L(
  day: number, start: string, end: string, subject: string, colour: string,
  room: string, section: string, semester: string, type: string,
  students: number, attendance: Lecture['attendance'], building = 'Main Building'
): Lecture {
  return { day, start, end, subject, colour, room, building, section, semester, type, faculty: F, department: D, students, attendance }
}

const LECTURES: Lecture[] = [
  L(1, '09:00', '10:00', 'Marketing', 'blue', 'Room 205', 'BBA II A', 'Sem III', 'Theory', 58, 'taken'),
  L(1, '10:00', '11:00', 'Digital Marketing', 'purple', 'Room 108', 'BBA III B', 'Sem V', 'Theory', 46, 'taken'),
  L(1, '11:00', '12:00', 'Finance', 'orange', 'Room 210', 'MBA I A', 'Sem I', 'Theory', 38, 'pending'),
  L(1, '13:30', '14:30', 'HR Management', 'green', 'Room 205', 'BBA II A', 'Sem III', 'Theory', 58, 'pending'),
  L(2, '09:00', '10:00', 'Finance', 'orange', 'Room 210', 'MBA I A', 'Sem I', 'Theory', 38, 'pending'),
  L(2, '10:00', '11:00', 'Marketing', 'blue', 'Room 205', 'BBA II A', 'Sem III', 'Theory', 58, 'pending'),
  L(2, '13:30', '15:30', 'Computer Lab', 'pink', 'Lab 2', 'BCA II', 'Sem III', 'Practical', 32, 'na', 'IT Block'),
  L(3, '09:00', '10:00', 'Marketing', 'blue', 'Room 205', 'BBA II A', 'Sem III', 'Theory', 58, 'pending'),
  L(3, '10:00', '11:00', 'HR Management', 'green', 'Room 108', 'BBA III B', 'Sem V', 'Theory', 46, 'pending'),
  L(3, '11:00', '12:00', 'Digital Marketing', 'purple', 'Room 108', 'BBA III B', 'Sem V', 'Theory', 46, 'pending'),
  L(3, '13:30', '14:30', 'Finance', 'orange', 'Room 210', 'MBA I A', 'Sem I', 'Tutorial', 38, 'pending'),
  L(3, '14:30', '15:30', 'Marketing Management', 'orange', 'Room 205', 'MBA I A', 'Sem I', 'Theory', 38, 'pending'),
  L(4, '10:00', '11:00', 'Marketing', 'blue', 'Room 205', 'BBA II A', 'Sem III', 'Theory', 58, 'pending'),
  L(4, '13:30', '14:30', 'HR Management', 'green', 'Room 205', 'BBA II A', 'Sem III', 'Theory', 58, 'pending'),
  L(5, '09:00', '10:00', 'Digital Marketing', 'purple', 'Room 108', 'BBA III B', 'Sem V', 'Theory', 46, 'pending'),
  L(5, '10:00', '11:00', 'Finance', 'orange', 'Room 210', 'MBA I A', 'Sem I', 'Theory', 38, 'pending'),
  L(5, '11:00', '12:00', 'Marketing', 'blue', 'Room 205', 'BBA II A', 'Sem III', 'Theory', 58, 'pending'),
  L(5, '14:30', '16:30', 'Computer Lab', 'pink', 'Lab 2', 'BCA II', 'Sem III', 'Practical', 32, 'na', 'IT Block'),
  L(6, '09:00', '10:00', 'Marketing', 'blue', 'Room 205', 'BBA II A', 'Sem III', 'Theory', 58, 'pending'),
  L(6, '10:00', '11:00', 'Digital Marketing', 'purple', 'Room 108', 'BBA III B', 'Sem V', 'Theory', 46, 'pending'),
]

const LEGEND = [
  { label: 'Marketing', colour: 'blue' },
  { label: 'HR', colour: 'green' },
  { label: 'Finance', colour: 'orange' },
  { label: 'Lab', colour: 'pink' },
  { label: 'Digital Marketing', colour: 'purple' },
  { label: 'Free Period', colour: 'gray' },
]

function fmt12(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hh = h % 12 === 0 ? 12 : h % 12
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`
}

function mondayOf(offset: number) {
  const d = new Date()
  const shift = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - shift + offset * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

export default function TimetableWeekly({ admin = false }: { admin?: boolean }) {
  const [view, setView] = useState<'week' | 'day' | 'list'>('week')
  const [weekOffset, setWeekOffset] = useState(0)
  const [dayIdx, setDayIdx] = useState(() => ((new Date().getDay() + 6) % 7) + 1)
  const [selected, setSelected] = useState<Lecture | null>(null)

  const monday = mondayOf(weekOffset)
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  const todayNum = weekOffset === 0 ? ((new Date().getDay() + 6) % 7) + 1 : -1

  const at = (day: number, start: string) => LECTURES.find((l) => l.day === day && l.start === start)
  const spanOf = (l: Lecture) => {
    const s = SLOTS.findIndex((x) => x.start === l.start)
    const e = SLOTS.findIndex((x) => x.end === l.end)
    return e > s ? e - s + 1 : 1
  }
  const covered = (day: number, slotIdx: number) =>
    LECTURES.some((l) => {
      if (l.day !== day) return false
      const s = SLOTS.findIndex((x) => x.start === l.start)
      return slotIdx > s && slotIdx < s + spanOf(l)
    })

  const exportCsv = () => {
    const rows = [['Day', 'Start', 'End', 'Subject', 'Section', 'Semester', 'Room', 'Building', 'Type']]
    LECTURES.slice()
      .sort((a, b) => a.day - b.day || a.start.localeCompare(b.start))
      .forEach((l) => rows.push([DAYS[l.day - 1], l.start, l.end, l.subject, l.section, l.semester, l.room, l.building, l.type]))
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'weekly-timetable.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const dayLectures = LECTURES.filter((l) => l.day === dayIdx).sort((a, b) => a.start.localeCompare(b.start))
  const allSorted = LECTURES.slice().sort((a, b) => a.day - b.day || a.start.localeCompare(b.start))

  return (
    <div className="tt-week">
      {/* Toolbar */}
      <section className="admin-card tt-toolbar">
        {admin && (
          <>
            <label className="tt-tb-field">
              <span>Faculty</span>
              <select><option>All Faculty</option><option selected>{F}</option></select>
            </label>
            <label className="tt-tb-field">
              <span>Department</span>
              <select><option>All Departments</option><option selected>{D}</option></select>
            </label>
          </>
        )}

        <div className="tt-tb-week">
          <button type="button" className="tt-icon-btn" onClick={() => setWeekOffset(weekOffset - 1)} aria-label="Previous week">
            <Icon name="chevron-left" size={16} />
          </button>
          <span className="tt-week-label">{fmtDate(monday)} – {fmtDate(sunday)}</span>
          <button type="button" className="tt-icon-btn" onClick={() => setWeekOffset(weekOffset + 1)} aria-label="Next week">
            <Icon name="chevron-right" size={16} />
          </button>
          <button type="button" className="tt-today-btn" onClick={() => setWeekOffset(0)}>Today</button>
        </div>

        <div className="tt-tb-spacer" />

        <div className="tt-toggle">
          {(['week', 'day', 'list'] as const).map((v) => (
            <button key={v} type="button" className={`tt-toggle-btn ${view === v ? 'is-active' : ''}`} onClick={() => setView(v)}>
              {v[0].toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        <button type="button" className="tt-icon-btn" onClick={() => window.print()} aria-label="Print">
          <Icon name="file-text" size={16} />
        </button>
        <button type="button" className="tt-icon-btn" onClick={exportCsv} aria-label="Export">
          <Icon name="download" size={16} />
        </button>
      </section>

      {/* WEEK VIEW */}
      {view === 'week' && (
        <section className="admin-card tt-grid-card">
          <div className="tt-grid-scroll">
            <table className="tt-table">
              <thead>
                <tr>
                  <th className="tt-th-time">Time</th>
                  {DAYS.map((d, i) => {
                    const date = new Date(monday)
                    date.setDate(date.getDate() + i)
                    return (
                      <th key={d} className={todayNum === i + 1 ? 'is-today' : ''}>
                        <span className="tt-th-day">{DAYS_SHORT[i]}</span>
                        <span className="tt-th-date">{fmtDate(date)}</span>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {SLOTS.map((slot, si) => (
                  <tr key={slot.start} className={slot.lunch ? 'is-lunch' : ''}>
                    <td className="tt-td-time">
                      <span>{fmt12(slot.start)}</span>
                      <small>{fmt12(slot.end)}</small>
                    </td>
                    {slot.lunch ? (
                      <td className="tt-lunch-cell" colSpan={7}>Lunch Break</td>
                    ) : (
                      DAYS.map((_, di) => {
                        const day = di + 1
                        if (covered(day, si)) return null
                        const lec = at(day, slot.start)
                        if (day === 7) return <td key={day} className="tt-cell is-off">Week Off</td>
                        if (!lec) return <td key={day} className="tt-cell tt-c-gray"><span className="tt-free">Free</span></td>
                        return (
                          <td key={day} className="tt-cell" rowSpan={spanOf(lec)}>
                            <button type="button" className={`tt-lec tt-c-${lec.colour}`} onClick={() => setSelected(lec)}>
                              <span className="tt-lec-subject">{lec.subject}</span>
                              <span className="tt-lec-meta">{lec.section}</span>
                              <span className="tt-lec-meta">{lec.room}</span>
                              <span className="tt-lec-time">{fmt12(lec.start)} – {fmt12(lec.end)}</span>
                            </button>
                          </td>
                        )
                      })
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* DAY VIEW */}
      {view === 'day' && (
        <section className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">{DAYS[dayIdx - 1]}</h3>
            <div className="tt-day-nav">
              {DAYS_SHORT.map((d, i) => (
                <button key={d} type="button" className={`tt-day-pill ${dayIdx === i + 1 ? 'is-active' : ''}`} onClick={() => setDayIdx(i + 1)}>{d}</button>
              ))}
            </div>
          </div>
          <div className="tt-day-list">
            {dayLectures.length === 0 && <div className="tt-empty">No lectures scheduled.</div>}
            {dayLectures.map((l) => (
              <button key={l.start} type="button" className={`tt-day-row tt-c-${l.colour}`} onClick={() => setSelected(l)}>
                <span className="tt-day-time">{fmt12(l.start)}<small>{fmt12(l.end)}</small></span>
                <span className="tt-day-main">
                  <span className="tt-lec-subject">{l.subject}</span>
                  <span className="tt-tl-meta">
                    <span><Icon name="building" size={13} /> {l.room}</span>
                    <span><Icon name="users" size={13} /> {l.section}</span>
                    <span><Icon name="file-text" size={13} /> {l.type}</span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* LIST VIEW */}
      {view === 'list' && (
        <section className="admin-card">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Day</th><th>Time</th><th>Subject</th><th>Section</th><th>Room</th><th>Type</th></tr>
              </thead>
              <tbody>
                {allSorted.map((l, i) => (
                  <tr key={i} onClick={() => setSelected(l)} style={{ cursor: 'pointer' }}>
                    <td>{DAYS_SHORT[l.day - 1]}</td>
                    <td>{fmt12(l.start)} – {fmt12(l.end)}</td>
                    <td><span className={`tt-badge tt-c-${l.colour}`}>{l.subject}</span></td>
                    <td>{l.section}</td>
                    <td>{l.room}</td>
                    <td>{l.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Legend */}
      <div className="tt-legend">
        {LEGEND.map((x) => (
          <span className={`tt-legend-item tt-c-${x.colour}`} key={x.label}><i /> {x.label}</span>
        ))}
      </div>

      {/* Lecture modal */}
      {selected && (
        <div className="tt-modal-backdrop" onClick={() => setSelected(null)}>
          <div className={`tt-modal tt-c-${selected.colour}`} onClick={(e) => e.stopPropagation()}>
            <div className="tt-modal-head">
              <div>
                <span className="tt-next-badge">{selected.type}</span>
                <h3 className="tt-modal-title">{selected.subject}</h3>
                <p className="tt-modal-sub">{DAYS[selected.day - 1]} · {fmt12(selected.start)} – {fmt12(selected.end)}</p>
              </div>
              <button type="button" className="tt-icon-btn" onClick={() => setSelected(null)} aria-label="Close">
                <Icon name="x" size={16} />
              </button>
            </div>
            <dl className="tt-modal-grid">
              <div><dt>Faculty</dt><dd>{selected.faculty}</dd></div>
              <div><dt>Department</dt><dd>{selected.department}</dd></div>
              <div><dt>Semester</dt><dd>{selected.semester}</dd></div>
              <div><dt>Section</dt><dd>{selected.section}</dd></div>
              <div><dt>Room</dt><dd>{selected.room}</dd></div>
              <div><dt>Building</dt><dd>{selected.building}</dd></div>
              <div><dt>Students</dt><dd>{selected.students}</dd></div>
              <div>
                <dt>Attendance</dt>
                <dd>
                  <span className={`tt-status is-${selected.attendance === 'taken' ? 'completed' : selected.attendance === 'pending' ? 'upcoming' : 'ongoing'}`}>
                    {selected.attendance === 'taken' ? 'Taken' : selected.attendance === 'pending' ? 'Pending' : 'N/A'}
                  </span>
                </dd>
              </div>
            </dl>
            <div className="tt-modal-actions">
              <button type="button" className="btn-primary"><Icon name="check-square" size={15} /> Take Attendance</button>
              <button type="button" className="btn-gold"><Icon name="users" size={15} /> View Students</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
