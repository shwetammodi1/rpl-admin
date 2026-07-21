import { useEffect, useState } from 'hono/jsx'
import Icon from '../components/Icon'
import {
  type AdminSlot,
  type MasterData,
  type SlotPayload,
  fetchAdminSlots,
  fetchMasterData,
  createSlot,
  updateSlot,
  deleteSlot,
} from '../lib/timetableApi'
import {
  DAYS,
  DAYS_SHORT,
  SLOTS,
  DEPARTMENTS,
  COURSES,
  SEMESTERS,
  SECTIONS,
  LECTURE_TYPES,
  ACADEMIC_YEARS,
  fmt12,
} from '../lib/timetable'

// PHASE 8 — real CRUD. The form works with record IDs; every save/delete hits
// the API and the grid is re-fetched. Phase 10 adds conflict detection.

const BLANK: SlotPayload = {
  facultyId: '',
  subjectId: '',
  classroomId: '',
  day: 1,
  startTime: '09:00',
  endTime: '10:00',
  department: DEPARTMENTS[0],
  course: COURSES[0],
  semester: SEMESTERS[2],
  section: 'A',
  lectureType: LECTURE_TYPES[0],
  status: 'draft',
  notes: '',
  academicYear: ACADEMIC_YEARS[0],
}

export default function TimetableManage() {
  const [rows, setRows] = useState<AdminSlot[]>([])
  const [md, setMd] = useState<MasterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState<SlotPayload>({ ...BLANK })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [filterFaculty, setFilterFaculty] = useState('')
  const [filterDay, setFilterDay] = useState('')
  const [filterBuilding, setFilterBuilding] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const reload = () =>
    fetchAdminSlots()
      .then(setRows)
      .catch(() => setRows([]))

  useEffect(() => {
    Promise.all([reload(), fetchMasterData().then(setMd).catch(() => setMd(null))]).finally(() =>
      setLoading(false)
    )
  }, [])

  const set = <K extends keyof SlotPayload>(k: K, v: SlotPayload[K]) => setForm({ ...form, [k]: v })

  const flash = (t: string) => {
    setMsg(t)
    setErr('')
    setTimeout(() => setMsg(''), 3500)
  }
  const fail = (t: string) => {
    setErr(t)
    setMsg('')
    setTimeout(() => setErr(''), 4500)
  }

  const faculty = md?.faculty ?? []
  const subjects = md?.subjects ?? []
  const classrooms = md?.classrooms ?? []
  const buildings = [...new Set(classrooms.map((r) => r.building).filter(Boolean) as string[])]
  const roomOpts = filterBuilding ? classrooms.filter((r) => r.building === filterBuilding) : classrooms

  const startAdd = () => {
    setForm({
      ...BLANK,
      facultyId: faculty[0]?.id ?? '',
      subjectId: subjects[0]?.id ?? '',
      classroomId: classrooms[0]?.id ?? '',
    })
    setEditingId(null)
    setOpen(true)
  }

  const startEdit = (r: AdminSlot) => {
    setForm({
      facultyId: r.faculty_id ?? '',
      subjectId: r.subject_id ?? '',
      classroomId: r.classroom_id ?? '',
      day: r.day,
      startTime: r.start_time,
      endTime: r.end_time,
      department: r.department ?? '',
      course: r.course ?? '',
      semester: r.semester ?? '',
      section: r.section ?? '',
      lectureType: r.lecture_type ?? 'Theory',
      status: r.status ?? 'draft',
      notes: r.notes ?? '',
      academicYear: r.academic_year ?? ACADEMIC_YEARS[0],
    })
    setEditingId(r.id)
    setOpen(true)
  }

  const save = async () => {
    setBusy(true)
    const ok = editingId ? await updateSlot(editingId, form) : await createSlot(form)
    if (ok) {
      await reload()
      flash(editingId ? 'Lecture updated.' : 'Lecture added.')
      setOpen(false)
      setEditingId(null)
    } else {
      fail('Could not save — please try again.')
    }
    setBusy(false)
  }

  const remove = async (r: AdminSlot) => {
    if (!confirm(`Delete ${r.subject ?? 'this lecture'} on ${DAYS[r.day - 1]} at ${fmt12(r.start_time)}?`)) return
    setBusy(true)
    const ok = await deleteSlot(r.id)
    if (ok) {
      await reload()
      flash('Lecture deleted.')
    } else fail('Could not delete — please try again.')
    setBusy(false)
  }

  const duplicate = async (r: AdminSlot) => {
    setBusy(true)
    const ok = await createSlot({
      facultyId: r.faculty_id ?? '',
      subjectId: r.subject_id ?? '',
      classroomId: r.classroom_id ?? '',
      day: r.day,
      startTime: r.start_time,
      endTime: r.end_time,
      department: r.department ?? '',
      course: r.course ?? '',
      semester: r.semester ?? '',
      section: r.section ?? '',
      lectureType: r.lecture_type ?? 'Theory',
      status: 'draft',
      notes: r.notes ?? '',
      academicYear: r.academic_year ?? ACADEMIC_YEARS[0],
    })
    if (ok) {
      await reload()
      flash('Lecture duplicated as Draft.')
    } else fail('Could not duplicate.')
    setBusy(false)
  }

  const togglePublish = async (r: AdminSlot) => {
    setBusy(true)
    const ok = await updateSlot(r.id, { status: r.status === 'published' ? 'draft' : 'published' })
    if (ok) {
      await reload()
      flash(r.status === 'published' ? 'Moved to Draft.' : 'Published.')
    } else fail('Could not change status.')
    setBusy(false)
  }

  const publishAllDrafts = async () => {
    const drafts = rows.filter((r) => r.status !== 'published')
    if (drafts.length === 0) return flash('No drafts to publish.')
    if (!confirm(`Publish ${drafts.length} draft lecture(s)?`)) return
    setBusy(true)
    for (const d of drafts) await updateSlot(d.id, { status: 'published' })
    await reload()
    flash(`${drafts.length} lecture(s) published.`)
    setBusy(false)
  }

  const exportCsv = () => {
    const head = ['Day', 'Start', 'End', 'Subject', 'Faculty', 'Course', 'Semester', 'Section', 'Room', 'Type', 'Status']
    const lines = [head, ...visible.map((r) => [
      DAYS[r.day - 1], r.start_time, r.end_time, r.subject ?? '', r.faculty ?? '',
      r.course ?? '', r.semester ?? '', r.section ?? '', r.room ?? '', r.lecture_type, r.status,
    ])]
    const csv = lines.map((l) => l.map((x) => `"${x}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'timetable.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const visible = rows
    .filter((r) => (filterFaculty ? r.faculty_id === filterFaculty : true))
    .filter((r) => (filterDay ? String(r.day) === filterDay : true))
    .filter((r) => (filterBuilding ? r.building === filterBuilding : true))
    .sort((a, b) => a.day - b.day || a.start_time.localeCompare(b.start_time))

  const published = rows.filter((r) => r.status === 'published').length

  return (
    <div className="tt-week">
      {/* Filters */}
      <section className="admin-card tt-manage-filters">
        <label className="tt-tb-field">
          <span>Academic Year</span>
          <select>{ACADEMIC_YEARS.map((o) => <option key={o}>{o}</option>)}</select>
        </label>
        <label className="tt-tb-field">
          <span>Faculty</span>
          <select value={filterFaculty} onChange={(e) => setFilterFaculty((e.target as HTMLSelectElement).value)}>
            <option value="">All Faculty</option>
            {faculty.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
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
          <select value={filterBuilding} onChange={(e) => setFilterBuilding((e.target as HTMLSelectElement).value)}>
            <option value="">All Buildings</option>
            {buildings.map((b) => <option key={b}>{b}</option>)}
          </select>
        </label>
      </section>

      {/* Actions */}
      <section className="admin-card tt-manage-actions">
        <button type="button" className="btn-primary" disabled={busy} onClick={startAdd}>
          <Icon name="calendar-plus" size={15} /> Add Lecture
        </button>
        <button type="button" className="tt-today-btn" disabled={busy} onClick={publishAllDrafts}>Publish All Drafts</button>
        <button type="button" className="tt-today-btn" disabled={busy} onClick={() => reload()}>Refresh</button>
        <button type="button" className="tt-today-btn" onClick={exportCsv}>Export</button>
        <div className="tt-tb-spacer" />
        <span className="tt-chip">{published} published</span>
        <span className="tt-chip">{rows.length - published} draft</span>
      </section>

      {msg && <div className="tt-flash"><Icon name="check-circle" size={15} /> {msg}</div>}
      {err && <div className="tt-flash is-error"><Icon name="alert" size={15} /> {err}</div>}

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
              <select value={form.facultyId} onChange={(e) => set('facultyId', (e.target as HTMLSelectElement).value)}>
                {faculty.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </label>
            <label className="tt-tb-field">
              <span>Subject</span>
              <select value={form.subjectId} onChange={(e) => set('subjectId', (e.target as HTMLSelectElement).value)}>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
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
              <span>Classroom</span>
              <select value={form.classroomId} onChange={(e) => set('classroomId', (e.target as HTMLSelectElement).value)}>
                {roomOpts.map((r) => <option key={r.id} value={r.id}>{r.name}{r.building ? ` · ${r.building}` : ''}</option>)}
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
              <select value={form.startTime} onChange={(e) => set('startTime', (e.target as HTMLSelectElement).value)}>
                {SLOTS.map((s) => <option key={s.start} value={s.start}>{fmt12(s.start)}</option>)}
              </select>
            </label>
            <label className="tt-tb-field">
              <span>End Time</span>
              <select value={form.endTime} onChange={(e) => set('endTime', (e.target as HTMLSelectElement).value)}>
                {SLOTS.map((s) => <option key={s.end} value={s.end}>{fmt12(s.end)}</option>)}
              </select>
            </label>
            <label className="tt-tb-field">
              <span>Lecture Type</span>
              <select value={form.lectureType} onChange={(e) => set('lectureType', (e.target as HTMLSelectElement).value)}>
                {LECTURE_TYPES.map((d) => <option key={d}>{d}</option>)}
              </select>
            </label>
            <label className="tt-tb-field">
              <span>Status</span>
              <select value={form.status} onChange={(e) => set('status', (e.target as HTMLSelectElement).value)}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
            <label className="tt-tb-field tt-form-wide">
              <span>Notes</span>
              <input value={form.notes} onInput={(e) => set('notes', (e.target as HTMLInputElement).value)} placeholder="Optional note for this lecture" />
            </label>
          </div>
          <div className="tt-form-actions">
            <button type="button" className="btn-primary" disabled={busy} onClick={save}>
              <Icon name="check" size={15} /> {busy ? 'Saving…' : editingId ? 'Update Lecture' : 'Save Lecture'}
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
                <th>Class</th><th>Room</th><th>Type</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={9} className="tt-empty">Loading…</td></tr>}
              {!loading && visible.length === 0 && (
                <tr><td colSpan={9} className="tt-empty">No lectures yet. Use “Add Lecture” to create one.</td></tr>
              )}
              {!loading && visible.map((r) => (
                <tr key={r.id}>
                  <td>{DAYS_SHORT[r.day - 1]}</td>
                  <td>{fmt12(r.start_time)} – {fmt12(r.end_time)}</td>
                  <td><span className={`tt-badge tt-c-${r.colour ?? 'gray'}`}>{r.subject ?? '—'}</span></td>
                  <td>{r.faculty ?? '—'}</td>
                  <td>{[r.course, r.semester, r.section].filter(Boolean).join(' ') || '—'}</td>
                  <td>{r.room ?? '—'}</td>
                  <td>{r.lecture_type}</td>
                  <td>
                    <button type="button" className={`tt-status is-${r.status === 'published' ? 'completed' : 'upcoming'} tt-status-btn`}
                      title="Click to toggle" disabled={busy} onClick={() => togglePublish(r)}>
                      {r.status === 'published' ? 'Published' : 'Draft'}
                    </button>
                  </td>
                  <td>
                    <div className="tt-row-actions">
                      <button type="button" className="tt-icon-btn" title="Edit" disabled={busy} onClick={() => startEdit(r)}>
                        <Icon name="file-text" size={14} />
                      </button>
                      <button type="button" className="tt-icon-btn" title="Duplicate" disabled={busy} onClick={() => duplicate(r)}>
                        <Icon name="refresh" size={14} />
                      </button>
                      <button type="button" className="tt-icon-btn is-danger" title="Delete" disabled={busy} onClick={() => remove(r)}>
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
