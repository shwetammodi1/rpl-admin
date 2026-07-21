import { useState } from 'hono/jsx'
import Icon from '../components/Icon'
import {
  DAYS,
  DAYS_SHORT,
  SLOTS,
  LECTURES,
  SUBJECTS,
  FACULTY_LIST,
  DEPARTMENTS,
  COURSES,
  SEMESTERS,
  SECTIONS,
  BUILDINGS,
  ROOMS,
  LECTURE_TYPES,
  ACADEMIC_YEARS,
  colourOf,
  fmt12,
} from '../lib/timetable'

// PHASE 6 — Admin UI only. Rows live in local state so the screen is usable to
// review; Phase 8 swaps these local operations for real API calls, and Phase 10
// adds the conflict detection rules.

type Row = {
  id: number
  day: number
  start: string
  end: string
  subject: string
  faculty: string
  department: string
  course: string
  semester: string
  section: string
  room: string
  building: string
  type: string
  status: 'Published' | 'Draft'
  notes: string
}

let seq = 1
const INITIAL: Row[] = LECTURES.map((l) => ({
  id: seq++,
  day: l.day,
  start: l.start,
  end: l.end,
  subject: l.subject,
  faculty: l.faculty,
  department: l.department,
  course: 'BBA',
  semester: l.semester,
  section: l.section,
  room: l.room,
  building: l.building,
  type: l.type,
  status: 'Published',
  notes: '',
}))

const BLANK: Omit<Row, 'id'> = {
  day: 1,
  start: '09:00',
  end: '10:00',
  subject: SUBJECTS[0].name,
  faculty: FACULTY_LIST[0],
  department: DEPARTMENTS[0],
  course: COURSES[0],
  semester: SEMESTERS[2],
  section: 'A',
  room: ROOMS[1],
  building: BUILDINGS[0],
  type: LECTURE_TYPES[0],
  status: 'Draft',
  notes: '',
}

export default function TimetableManage() {
  const [rows, setRows] = useState<Row[]>(INITIAL)
  const [form, setForm] = useState<Omit<Row, 'id'>>({ ...BLANK })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const [filterFaculty, setFilterFaculty] = useState('')
  const [filterDay, setFilterDay] = useState('')
  const [msg, setMsg] = useState('')

  const set = <K extends keyof Omit<Row, 'id'>>(k: K, v: Omit<Row, 'id'>[K]) =>
    setForm({ ...form, [k]: v })

  const flash = (t: string) => {
    setMsg(t)
    setTimeout(() => setMsg(''), 3000)
  }

  const startAdd = () => {
    setForm({ ...BLANK })
    setEditingId(null)
    setOpen(true)
  }

  const startEdit = (r: Row) => {
    const { id, ...rest } = r
    setForm(rest)
    setEditingId(id)
    setOpen(true)
  }

  const save = () => {
    if (editingId) {
      setRows(rows.map((r) => (r.id === editingId ? { ...form, id: editingId } : r)))
      flash('Lecture updated (local preview — saved to server in Phase 8)')
    } else {
      setRows([...rows, { ...form, id: seq++ }])
      flash('Lecture added (local preview — saved to server in Phase 8)')
    }
    setOpen(false)
    setEditingId(null)
  }

  const remove = (id: number) => {
    if (!confirm('Delete this lecture?')) return
    setRows(rows.filter((r) => r.id !== id))
    flash('Lecture deleted (local preview)')
  }

  const duplicate = (r: Row) => {
    setRows([...rows, { ...r, id: seq++, status: 'Draft' }])
    flash('Lecture duplicated as Draft')
  }

  const visible = rows
    .filter((r) => (filterFaculty ? r.faculty === filterFaculty : true))
    .filter((r) => (filterDay ? String(r.day) === filterDay : true))
    .sort((a, b) => a.day - b.day || a.start.localeCompare(b.start))

  const published = rows.filter((r) => r.status === 'Published').length
  const drafts = rows.length - published

  return (
    <div className="tt-week">
      {/* Filters */}
      <section className="admin-card tt-manage-filters">
        {[
          { label: 'Academic Year', opts: ACADEMIC_YEARS },
          { label: 'Semester', opts: SEMESTERS },
          { label: 'Department', opts: DEPARTMENTS },
          { label: 'Course', opts: COURSES },
        ].map((f) => (
          <label className="tt-tb-field" key={f.label}>
            <span>{f.label}</span>
            <select>{f.opts.map((o) => <option key={o}>{o}</option>)}</select>
          </label>
        ))}
        <label className="tt-tb-field">
          <span>Faculty</span>
          <select value={filterFaculty} onChange={(e) => setFilterFaculty((e.target as HTMLSelectElement).value)}>
            <option value="">All Faculty</option>
            {FACULTY_LIST.map((f) => <option key={f}>{f}</option>)}
          </select>
        </label>
        <label className="tt-tb-field">
          <span>Day</span>
          <select value={filterDay} onChange={(e) => setFilterDay((e.target as HTMLSelectElement).value)}>
            <option value="">All Days</option>
            {DAYS.map((d, i) => <option key={d} value={String(i + 1)}>{d}</option>)}
          </select>
        </label>
        <label className="tt-tb-field">
          <span>Building</span>
          <select>{['All Buildings', ...BUILDINGS].map((o) => <option key={o}>{o}</option>)}</select>
        </label>
        <label className="tt-tb-field">
          <span>Classroom</span>
          <select>{['All Rooms', ...ROOMS].map((o) => <option key={o}>{o}</option>)}</select>
        </label>
      </section>

      {/* Actions */}
      <section className="admin-card tt-manage-actions">
        <button type="button" className="btn-primary" onClick={startAdd}>
          <Icon name="calendar-plus" size={15} /> Add Lecture
        </button>
        <button type="button" className="tt-today-btn">Generate Timetable</button>
        <button type="button" className="tt-today-btn">Save Draft</button>
        <button type="button" className="tt-today-btn">Publish</button>
        <button type="button" className="tt-today-btn">Duplicate Week</button>
        <button type="button" className="tt-today-btn">Import</button>
        <button type="button" className="tt-today-btn">Export</button>
        <div className="tt-tb-spacer" />
        <span className="tt-chip">{published} published</span>
        <span className="tt-chip">{drafts} draft</span>
      </section>

      {msg && <div className="tt-flash"><Icon name="check-circle" size={15} /> {msg}</div>}

      {/* Entry form */}
      {open && (
        <section className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">{editingId ? 'Edit Lecture' : 'New Lecture'}</h3>
            <button type="button" className="tt-icon-btn" onClick={() => setOpen(false)} aria-label="Close">
              <Icon name="x" size={16} />
            </button>
          </div>
          <div className="tt-form-grid">
            <label className="tt-tb-field">
              <span>Faculty</span>
              <select value={form.faculty} onChange={(e) => set('faculty', (e.target as HTMLSelectElement).value)}>
                {FACULTY_LIST.map((f) => <option key={f}>{f}</option>)}
              </select>
            </label>
            <label className="tt-tb-field">
              <span>Subject</span>
              <select value={form.subject} onChange={(e) => set('subject', (e.target as HTMLSelectElement).value)}>
                {SUBJECTS.map((s) => <option key={s.name}>{s.name}</option>)}
              </select>
            </label>
            <label className="tt-tb-field">
              <span>Department</span>
              <select value={form.department} onChange={(e) => set('department', (e.target as HTMLSelectElement).value)}>
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </label>
            <label className="tt-tb-field">
              <span>Course</span>
              <select value={form.course} onChange={(e) => set('course', (e.target as HTMLSelectElement).value)}>
                {COURSES.map((d) => <option key={d}>{d}</option>)}
              </select>
            </label>
            <label className="tt-tb-field">
              <span>Semester</span>
              <select value={form.semester} onChange={(e) => set('semester', (e.target as HTMLSelectElement).value)}>
                {SEMESTERS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </label>
            <label className="tt-tb-field">
              <span>Section</span>
              <select value={form.section} onChange={(e) => set('section', (e.target as HTMLSelectElement).value)}>
                {SECTIONS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </label>
            <label className="tt-tb-field">
              <span>Building</span>
              <select value={form.building} onChange={(e) => set('building', (e.target as HTMLSelectElement).value)}>
                {BUILDINGS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </label>
            <label className="tt-tb-field">
              <span>Room</span>
              <select value={form.room} onChange={(e) => set('room', (e.target as HTMLSelectElement).value)}>
                {ROOMS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </label>
            <label className="tt-tb-field">
              <span>Day</span>
              <select value={String(form.day)} onChange={(e) => set('day', Number((e.target as HTMLSelectElement).value))}>
                {DAYS.map((d, i) => <option key={d} value={String(i + 1)}>{d}</option>)}
              </select>
            </label>
            <label className="tt-tb-field">
              <span>Start Time</span>
              <select value={form.start} onChange={(e) => set('start', (e.target as HTMLSelectElement).value)}>
                {SLOTS.map((s) => <option key={s.start} value={s.start}>{fmt12(s.start)}</option>)}
              </select>
            </label>
            <label className="tt-tb-field">
              <span>End Time</span>
              <select value={form.end} onChange={(e) => set('end', (e.target as HTMLSelectElement).value)}>
                {SLOTS.map((s) => <option key={s.end} value={s.end}>{fmt12(s.end)}</option>)}
              </select>
            </label>
            <label className="tt-tb-field">
              <span>Lecture Type</span>
              <select value={form.type} onChange={(e) => set('type', (e.target as HTMLSelectElement).value)}>
                {LECTURE_TYPES.map((d) => <option key={d}>{d}</option>)}
              </select>
            </label>
            <label className="tt-tb-field">
              <span>Status</span>
              <select value={form.status} onChange={(e) => set('status', (e.target as HTMLSelectElement).value as Row['status'])}>
                <option>Draft</option>
                <option>Published</option>
              </select>
            </label>
            <label className="tt-tb-field tt-form-wide">
              <span>Notes</span>
              <input value={form.notes} onInput={(e) => set('notes', (e.target as HTMLInputElement).value)} placeholder="Optional note for this lecture" />
            </label>
          </div>
          <div className="tt-form-actions">
            <button type="button" className="btn-primary" onClick={save}>
              <Icon name="check" size={15} /> {editingId ? 'Update Lecture' : 'Save Lecture'}
            </button>
            <button type="button" className="tt-today-btn" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </section>
      )}

      {/* Grid */}
      <section className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">Timetable Entries</h3>
          <span className="tt-chip">{visible.length} of {rows.length}</span>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Day</th><th>Time</th><th>Subject</th><th>Faculty</th>
                <th>Section</th><th>Room</th><th>Type</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr><td colSpan={9} className="tt-empty">No lectures match these filters.</td></tr>
              )}
              {visible.map((r) => (
                <tr key={r.id}>
                  <td>{DAYS_SHORT[r.day - 1]}</td>
                  <td>{fmt12(r.start)} – {fmt12(r.end)}</td>
                  <td><span className={`tt-badge tt-c-${colourOf(r.subject)}`}>{r.subject}</span></td>
                  <td>{r.faculty}</td>
                  <td>{r.section}</td>
                  <td>{r.room}</td>
                  <td>{r.type}</td>
                  <td>
                    <span className={`tt-status is-${r.status === 'Published' ? 'completed' : 'upcoming'}`}>{r.status}</span>
                  </td>
                  <td>
                    <div className="tt-row-actions">
                      <button type="button" className="tt-icon-btn" title="Edit" onClick={() => startEdit(r)}>
                        <Icon name="file-text" size={14} />
                      </button>
                      <button type="button" className="tt-icon-btn" title="Duplicate" onClick={() => duplicate(r)}>
                        <Icon name="refresh" size={14} />
                      </button>
                      <button type="button" className="tt-icon-btn is-danger" title="Delete" onClick={() => remove(r.id)}>
                        <Icon name="x" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
