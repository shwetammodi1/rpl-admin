import { useEffect, useState } from 'hono/jsx'
import Icon from '../components/Icon'
import {
  type Lecture,
  DAYS,
  DAYS_SHORT,
  SLOTS,
  LEGEND,
  fmt12,
  mondayOf,
  fmtDate,
} from '../lib/timetable'
import { fetchAdminSlots, fetchMyTimetable, toLecture } from '../lib/timetableApi'

// PHASE 7 — now loads real data. Faculty see their own published timetable;
// admins see the college-wide slots. `admin` also shows the extra filters.

export default function TimetableWeekly({ admin = false }: { admin?: boolean }) {
  const [view, setView] = useState<'week' | 'day' | 'list'>('week')
  const [weekOffset, setWeekOffset] = useState(0)
  const [dayIdx, setDayIdx] = useState(() => ((new Date().getDay() + 6) % 7) + 1)
  const [selected, setSelected] = useState<Lecture | null>(null)
  const [LECTURES, setLectures] = useState<Lecture[]>([])
  const [loading, setLoading] = useState(true)
  const [facultyNames, setFacultyNames] = useState<string[]>([])

  useEffect(() => {
    const load = admin
      ? fetchAdminSlots().then((slots) => {
          setFacultyNames([...new Set(slots.map((s) => s.faculty).filter(Boolean) as string[])])
          return slots.map(toLecture)
        })
      : fetchMyTimetable()
    load
      .then(setLectures)
      .catch(() => setLectures([]))
      .finally(() => setLoading(false))
  }, [])

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
          <label className="tt-tb-field">
            <span>Faculty</span>
            <select>
              <option>All Faculty</option>
              {facultyNames.map((f) => <option key={f}>{f}</option>)}
            </select>
          </label>
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

      {loading && <section className="admin-card tt-empty">Loading timetable…</section>}
      {!loading && LECTURES.length === 0 && (
        <section className="admin-card tt-empty">
          No published lectures yet.{admin ? ' Add them from Manage Timetable.' : ' Your timetable will appear here once published.'}
        </section>
      )}

      {/* WEEK VIEW */}
      {!loading && LECTURES.length > 0 && view === 'week' && (
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
      {!loading && LECTURES.length > 0 && view === 'day' && (
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
      {!loading && LECTURES.length > 0 && view === 'list' && (
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
