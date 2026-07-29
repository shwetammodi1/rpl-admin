import { useEffect, useState } from 'hono/jsx'
import Icon from '../components/Icon'
import { COURSES, YEARS, SECTIONS } from '../lib/timetable'

// Class identity = Course + Year + Section. The Excel is course-wise, so Course
// is chosen at upload; each row carries Section + Year (with a shared fallback).

type NewStudent = { rollNo: string; name: string; year: string; section: string }
type Student = { id: string; roll_no: string | null; name: string; course: string | null; semester: string | null; section: string | null }
type ClassRow = { course: string | null; semester: string | null; section: string | null; n: number }

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('rpl_token') ?? ''
  return { Authorization: `Bearer ${token}` }
}

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQ) {
      if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++ } else inQ = false } else cur += ch
    } else if (ch === '"') inQ = true
    else if (ch === ',') { out.push(cur); cur = '' } else cur += ch
  }
  out.push(cur)
  return out
}

function col(headers: string[], ...aliases: string[]) {
  for (const a of aliases) {
    const i = headers.findIndex((h) => h === a || h.includes(a))
    if (i >= 0) return i
  }
  return -1
}

function parseCsv(text: string): { rows: NewStudent[]; error?: string } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (!lines.length) return { rows: [], error: 'File khaali hai.' }
  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase())

  const rollI = col(headers, 'roll', 'enroll', 'rollno')
  const nameI = col(headers, 'name', 'student')
  const yearI = col(headers, 'year')
  const secI = col(headers, 'section', 'sec')

  if (nameI === -1) return { rows: [], error: 'Koi "Name" column nahi mila. Header row me kam se kam Name hona chahiye (Roll No, Section, Year optional).' }

  const rows: NewStudent[] = []
  for (let i = 1; i < lines.length; i++) {
    const c = parseCsvLine(lines[i])
    const name = (c[nameI] ?? '').trim()
    if (!name) continue
    rows.push({
      rollNo: rollI >= 0 ? (c[rollI] ?? '').trim() : '',
      name,
      year: yearI >= 0 ? (c[yearI] ?? '').trim() : '',
      section: secI >= 0 ? (c[secI] ?? '').trim() : '',
    })
  }
  return { rows }
}

export default function StudentsAdmin() {
  const [parsed, setParsed] = useState<NewStudent[]>([])
  const [fileName, setFileName] = useState('')
  const [parseErr, setParseErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  // Course is always chosen at upload (file is course-wise). Year/Section act as
  // a fallback for rows that don't carry them.
  const [course, setCourse] = useState(COURSES[0])
  const [year, setYear] = useState(YEARS[1])
  const [section, setSection] = useState('A')

  const [classes, setClasses] = useState<ClassRow[]>([])
  const [viewKey, setViewKey] = useState('')
  const [list, setList] = useState<Student[]>([])

  const loadClasses = () =>
    fetch('/api/admin/students', { headers: authHeaders() })
      .then((r) => (r.ok ? r.json<{ classes: ClassRow[] }>() : { classes: [] }))
      .then((d) => setClasses(d.classes ?? []))
      .catch(() => {})

  useEffect(() => { loadClasses() }, [])

  const onFile = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      const { rows, error } = parseCsv(String(reader.result ?? ''))
      setParseErr(error ?? '')
      setParsed(rows)
    }
    reader.readAsText(file)
  }

  const doImport = async () => {
    if (!parsed.length) return
    setBusy(true)
    setMsg('')
    const students = parsed.map((r) => ({
      rollNo: r.rollNo,
      name: r.name,
      course, // always the chosen course
      semester: r.year || year, // year stored in the semester column
      section: r.section || section,
    }))
    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ students }),
      })
      if (res.ok) {
        const d = await res.json<{ imported: number; skipped: number }>()
        setMsg(`✓ ${d.imported} students imported${d.skipped ? `, ${d.skipped} skipped` : ''}.`)
        setParsed([])
        setFileName('')
        loadClasses()
      } else {
        setMsg('Import failed — try again.')
      }
    } catch {
      setMsg('Network error — try again.')
    } finally {
      setBusy(false)
    }
  }

  const viewClass = (cl: ClassRow) => {
    const key = `${cl.course}|${cl.semester}|${cl.section}`
    setViewKey(key)
    const qs = new URLSearchParams({ course: cl.course ?? '', semester: cl.semester ?? '', section: cl.section ?? '' })
    fetch(`/api/admin/students?${qs}`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json<{ students: Student[] }>() : { students: [] }))
      .then((d) => setList(d.students ?? []))
      .catch(() => setList([]))
  }

  return (
    <div className="tt-week">
      {/* Upload */}
      <section className="admin-card tt-students-upload">
        <div className="admin-card-header">
          <h3 className="admin-card-title">Upload Students (Excel / CSV)</h3>
        </div>
        <div className="tt-students-body">
          <p className="tt-students-hint">
            File course-wise hai — <strong>Course</strong> yahan chuno. Excel me columns:{' '}
            <strong>Roll No, Name, Section, Year</strong>. Excel ko <strong>Save As → CSV</strong> karke upload karo.
            Agar file me Section/Year na hon to neeche chuni hui values sab pe lag jayengi.
          </p>

          <div className="tt-students-class">
            <label className="tt-tb-field"><span>Course</span>
              <select value={course} onChange={(e) => setCourse((e.target as HTMLSelectElement).value)}>
                {COURSES.map((o) => <option key={o}>{o}</option>)}
              </select></label>
            <label className="tt-tb-field"><span>Year (fallback)</span>
              <select value={year} onChange={(e) => setYear((e.target as HTMLSelectElement).value)}>
                {YEARS.map((o) => <option key={o}>{o}</option>)}
              </select></label>
            <label className="tt-tb-field"><span>Section (fallback)</span>
              <select value={section} onChange={(e) => setSection((e.target as HTMLSelectElement).value)}>
                {SECTIONS.map((o) => <option key={o}>{o}</option>)}
              </select></label>
          </div>

          <div className="tt-students-controls">
            <label className="btn-primary tt-file-btn">
              <Icon name="download" size={15} /> Choose CSV
              <input type="file" accept=".csv,text/csv" hidden onChange={onFile} />
            </label>
            {fileName && <span className="tt-file-name">{fileName} — {parsed.length} rows</span>}
          </div>

          {parseErr && <div className="tt-flash is-error"><Icon name="alert" size={15} /> {parseErr}</div>}

          {parsed.length > 0 && (
            <>
              <div className="admin-table-wrap tt-preview">
                <table className="admin-table">
                  <thead><tr><th>Roll No</th><th>Name</th><th>Course</th><th>Year</th><th>Section</th></tr></thead>
                  <tbody>
                    {parsed.slice(0, 8).map((r, i) => (
                      <tr key={i}><td>{r.rollNo || '—'}</td><td>{r.name}</td><td>{course}</td><td>{r.year || year}</td><td>{r.section || section}</td></tr>
                    ))}
                  </tbody>
                </table>
                {parsed.length > 8 && <div className="tt-preview-more">+{parsed.length - 8} more…</div>}
              </div>
              <div className="tt-form-actions">
                <button type="button" className="btn-primary" disabled={busy} onClick={doImport}>
                  <Icon name="check" size={15} /> {busy ? 'Importing…' : `Import ${parsed.length} Students`}
                </button>
              </div>
            </>
          )}

          {msg && <div className="tt-flash"><Icon name="check-circle" size={15} /> {msg}</div>}
        </div>
      </section>

      {/* Existing classes */}
      <section className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">Classes</h3>
          <span className="tt-chip">{classes.length} classes</span>
        </div>
        <div className="tt-students-body">
          {classes.length === 0 && <p className="tt-students-hint">Abhi koi student nahi. Upar CSV upload karo.</p>}
          <div className="tt-class-chips">
            {classes.map((cl) => {
              const key = `${cl.course}|${cl.semester}|${cl.section}`
              return (
                <button type="button" key={key} className={`tt-class-chip ${viewKey === key ? 'is-active' : ''}`} onClick={() => viewClass(cl)}>
                  {[cl.course, cl.semester, cl.section].filter(Boolean).join(' ')} <span>{cl.n}</span>
                </button>
              )
            })}
          </div>

          {viewKey && (
            <div className="admin-table-wrap tt-preview">
              <table className="admin-table">
                <thead><tr><th>Roll No</th><th>Name</th></tr></thead>
                <tbody>
                  {list.map((s) => <tr key={s.id}><td>{s.roll_no || '—'}</td><td>{s.name}</td></tr>)}
                  {list.length === 0 && <tr><td colSpan={2} className="tt-empty">No students.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
