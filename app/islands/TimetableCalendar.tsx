import { useEffect, useState } from 'hono/jsx'
import Icon from '../components/Icon'
import { fetchAdminSlots, fetchMyTimetable, toLecture } from '../lib/timetableApi'
import {
  type Lecture,
  DAYS,
  DAYS_SHORT,
  MONTHS,
  fmt12,
  fmtDate,
  isSameDay,
  weekdayOf,
  dayKind,
  mondayOf,
} from '../lib/timetable'

// PHASE 5 — UI only. Events are derived from the shared dummy weekly pattern
// in lib/timetable.ts; Phase 7 swaps that source for the real API.

const MAX_PER_CELL = 3

export default function TimetableCalendar({ admin = false }: { admin?: boolean }) {
  const today = new Date()
  const [view, setView] = useState<'month' | 'week'>('month')
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [weekOffset, setWeekOffset] = useState(0)
  const [selected, setSelected] = useState<{ lecture: Lecture; date: Date } | null>(null)
  const [expanded, setExpanded] = useState<Date | null>(null)
  const [lectures, setLectures] = useState<Lecture[]>([])

  useEffect(() => {
    const load = admin ? fetchAdminSlots().then((s) => s.map(toLecture)) : fetchMyTimetable()
    load.then(setLectures).catch(() => setLectures([]))
  }, [])

  // ---- month grid (6 weeks, Monday-first) ----
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const first = new Date(year, month, 1)
  const pad = (first.getDay() + 6) % 7
  const cells: Date[] = []
  for (let i = 0; i < 42; i++) cells.push(new Date(year, month, 1 - pad + i))

  // ---- week strip ----
  const weekMonday = mondayOf(weekOffset)
  const weekDates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekMonday)
    d.setDate(d.getDate() + i)
    weekDates.push(d)
  }

  const goToday = () => {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1))
    setWeekOffset(0)
  }
  const shiftMonth = (n: number) => setCursor(new Date(year, month + n, 1))

  const monthLabel = `${MONTHS[month]} ${year}`
  const weekLabel = `${fmtDate(weekDates[0])} – ${fmtDate(weekDates[6])}`

  // Group once per render — the month grid asks 42 times, so filtering and
  // sorting inside every cell is wasteful.
  const byDay = new Map<number, Lecture[]>()
  for (const l of lectures) {
    const list = byDay.get(l.day)
    if (list) list.push(l)
    else byDay.set(l.day, [l])
  }
  for (const list of byDay.values()) list.sort((a, b) => a.start.localeCompare(b.start))

  const lecturesFor = (d: Date, kind: string) =>
    kind === 'normal' ? byDay.get(weekdayOf(d)) ?? [] : []

  const renderEvent = (l: Lecture, d: Date, key: string) => (
    <button
      key={key}
      type="button"
      className={`tt-cal-event tt-c-${l.colour}`}
      onClick={(e) => {
        e.stopPropagation()
        setSelected({ lecture: l, date: d })
      }}
    >
      <i />
      <span className="tt-cal-ev-time">{fmt12(l.start).replace(':00', '')}</span>
      <span className="tt-cal-ev-name">{l.subject}</span>
    </button>
  )

  return (
    <div className="tt-week">
      {/* Toolbar */}
      <section className="admin-card tt-toolbar">
        {admin && (
          <label className="tt-tb-field">
            <span>Faculty</span>
            <select><option>All Faculty</option><option selected>Devendra Nagwanshi</option></select>
          </label>
        )}
        <div className="tt-tb-week">
          <button type="button" className="tt-icon-btn" aria-label="Previous"
            onClick={() => (view === 'month' ? shiftMonth(-1) : setWeekOffset(weekOffset - 1))}>
            <Icon name="chevron-left" size={16} />
          </button>
          <span className="tt-week-label">{view === 'month' ? monthLabel : weekLabel}</span>
          <button type="button" className="tt-icon-btn" aria-label="Next"
            onClick={() => (view === 'month' ? shiftMonth(1) : setWeekOffset(weekOffset + 1))}>
            <Icon name="chevron-right" size={16} />
          </button>
          <button type="button" className="tt-today-btn" onClick={goToday}>Today</button>
        </div>

        <div className="tt-tb-spacer" />

        <div className="tt-toggle">
          {(['month', 'week'] as const).map((v) => (
            <button key={v} type="button" className={`tt-toggle-btn ${view === v ? 'is-active' : ''}`} onClick={() => setView(v)}>
              {v[0].toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </section>

      {/* MONTH VIEW */}
      {view === 'month' && (
        <section className="admin-card tt-grid-card">
          <div className="tt-cal-head">
            {DAYS_SHORT.map((d) => <span key={d}>{d}</span>)}
          </div>
          <div className="tt-cal-grid">
            {cells.map((d, i) => {
              const inMonth = d.getMonth() === month
              const kind = dayKind(d)
              const list = lecturesFor(d, kind)
              const isToday = isSameDay(d, today)
              const showAll = expanded && isSameDay(expanded, d)
              const visible = showAll ? list : list.slice(0, MAX_PER_CELL)
              return (
                <div
                  key={i}
                  className={`tt-cal-cell ${inMonth ? '' : 'is-out'} ${isToday ? 'is-today' : ''} is-${kind}`}
                  onClick={() => setExpanded(showAll ? null : d)}
                >
                  <span className="tt-cal-date">{d.getDate()}</span>
                  {kind === 'holiday' && <span className="tt-cal-tag is-holiday">Holiday</span>}
                  {kind === 'leave' && <span className="tt-cal-tag is-leave">Leave</span>}
                  {kind === 'off' && <span className="tt-cal-tag is-off">Week Off</span>}
                  {visible.map((l, k) => renderEvent(l, d, `${i}-${k}`))}
                  {!showAll && list.length > MAX_PER_CELL && (
                    <span className="tt-cal-more">+{list.length - MAX_PER_CELL} more</span>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* WEEK VIEW */}
      {view === 'week' && (
        <section className="admin-card tt-grid-card">
          <div className="tt-cal-week">
            {weekDates.map((d, i) => {
              const kind = dayKind(d)
              const list = lecturesFor(d, kind)
              return (
                <div key={i} className={`tt-cal-wcol ${isSameDay(d, today) ? 'is-today' : ''}`}>
                  <div className="tt-cal-whead">
                    <span className="tt-th-day">{DAYS_SHORT[i]}</span>
                    <span className="tt-th-date">{fmtDate(d)}</span>
                  </div>
                  <div className="tt-cal-wbody">
                    {kind === 'holiday' && <span className="tt-cal-tag is-holiday">Holiday</span>}
                    {kind === 'leave' && <span className="tt-cal-tag is-leave">Leave</span>}
                    {kind === 'off' && <span className="tt-cal-tag is-off">Week Off</span>}
                    {list.map((l, k) => renderEvent(l, d, `w${i}-${k}`))}
                    {kind === 'normal' && list.length === 0 && <span className="tt-cal-more">No lectures</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Legend */}
      <div className="tt-legend">
        <span className="tt-legend-item tt-c-blue"><i /> Marketing</span>
        <span className="tt-legend-item tt-c-green"><i /> HR</span>
        <span className="tt-legend-item tt-c-orange"><i /> Finance</span>
        <span className="tt-legend-item tt-c-pink"><i /> Lab</span>
        <span className="tt-legend-item tt-c-purple"><i /> Digital Marketing</span>
        <span className="tt-legend-item tt-l-holiday"><i /> Holiday</span>
        <span className="tt-legend-item tt-l-leave"><i /> Leave</span>
      </div>

      {/* Lecture details modal */}
      {selected && (
        <div className="tt-modal-backdrop" onClick={() => setSelected(null)}>
          <div className={`tt-modal tt-c-${selected.lecture.colour}`} onClick={(e) => e.stopPropagation()}>
            <div className="tt-modal-head">
              <div>
                <span className="tt-next-badge">{selected.lecture.type}</span>
                <h3 className="tt-modal-title">{selected.lecture.subject}</h3>
                <p className="tt-modal-sub">
                  {DAYS[selected.lecture.day - 1]}, {fmtDate(selected.date)} ·{' '}
                  {fmt12(selected.lecture.start)} – {fmt12(selected.lecture.end)}
                </p>
              </div>
              <button type="button" className="tt-icon-btn" onClick={() => setSelected(null)} aria-label="Close">
                <Icon name="x" size={16} />
              </button>
            </div>
            <dl className="tt-modal-grid">
              <div><dt>Faculty</dt><dd>{selected.lecture.faculty}</dd></div>
              <div><dt>Department</dt><dd>{selected.lecture.department}</dd></div>
              <div><dt>Semester</dt><dd>{selected.lecture.semester}</dd></div>
              <div><dt>Section</dt><dd>{selected.lecture.section}</dd></div>
              <div><dt>Room</dt><dd>{selected.lecture.room}</dd></div>
              <div><dt>Building</dt><dd>{selected.lecture.building}</dd></div>
              <div><dt>Students</dt><dd>{selected.lecture.students}</dd></div>
              <div>
                <dt>Attendance</dt>
                <dd>
                  <span className={`tt-status is-${selected.lecture.attendance === 'taken' ? 'completed' : 'upcoming'}`}>
                    {selected.lecture.attendance === 'taken' ? 'Taken' : selected.lecture.attendance === 'pending' ? 'Pending' : 'N/A'}
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
