import { useEffect, useState } from 'hono/jsx'
import Icon from '../components/Icon'

type NewStudent = { rollNo: string; name: string; course: string; semester: string; section: string }
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

// Find a header index by any of the given aliases.
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

  const rollI = col(headers, 'roll', 'enroll', 'roll no', 'rollno')
  const nameI = col(headers, 'name', 'student')
  const courseI = col(headers, 'course', 'program', 'class')
  const semI = col(headers, 'semester', 'sem')
  const secI = col(headers, 'section', 'sec')

  if (nameI === -1) return { rows: [], error: 'Koi "Name" column nahi mila. Header row me Name / Roll No / Course / Semester / Section hone chahiye.' }

  const rows: NewStudent[] = []
  for (let i = 1; i < lines.length; i++) {
    const c = parseCsvLine(lines[i])
    const name = (c[nameI] ?? '').trim()
    if (!name) continue
    rows.push({
      rollNo: rollI >= 0 ? (c[rollI] ?? '').trim() : '',
      name,
      course: courseI >= 0 ? (c[courseI] ?? '').trim() : '',
      semester: semI >= 0 ? (c[semI] ?? '').trim() : '',
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
  // shared class fields when the file has no class columns
  const [course, setCourse] = useState('')
  const [semester, setSemester] = useState('')
  const [section, setSection] = useState('')

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

  const missingClass = parsed.length > 0 && parsed.every((r) => !r.course && !r.semester && !r.section)

  const doImport = async () => {
    if (!parsed.length) return
    if (missingClass && (!course || !semester || !section)) {
      setMsg('File me class columns nahi hain — upar Course / Semester / Section chuno.')
      return
    }
    setBusy(true)
    setMsg('')
    const students = parsed.map((r) => ({
      rollNo: r.rollNo,
      name: r.name,
      course: r.course || course,
      semester: r.semester || semester,
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
            Excel me columns: <strong>Roll No, Name, Course, Semester, Section</strong>.
            Excel ko <strong>Save As → CSV</strong> karke upload karo. Agar file me class columns nahi hain,
            to neeche Course/Semester/Section chun lo — sabhi students usi class me add honge.
          </p>

          <div className="tt-students-controls">
            <label className="btn-primary tt-file-btn">
              <Icon name="download" size={15} /> Choose CSV
              <input type="file" accept=".csv,text/csv" hidden onChange={onFile} />
            </label>
            {fileName && <span className="tt-file-name">{fileName} — {parsed.length} rows</span>}
          </div>

          {missingClass && (
            <div className="tt-students-class">
              <label className="tt-tb-field"><span>Course</span>
                <input value={course} placeholder="BBA" onInput={(e) => setCourse((e.target as HTMLInputElement).value)} /></label>
              <label className="tt-tb-field"><span>Semester</span>
                <input value={semester} placeholder="Sem III" onInput={(e) => setSemester((e.target as HTMLInputElement).value)} /></label>
              <label className="tt-tb-field"><span>Section</span>
                <input value={section} placeholder="A" onInput={(e) => setSection((e.target as HTMLInputElement).value)} /></label>
            </div>
          )}

          {parseErr && <div className="tt-flash is-error"><Icon name="alert" size={15} /> {parseErr}</div>}

          {parsed.length > 0 && (
            <>
              <div className="admin-table-wrap tt-preview">
                <table className="admin-table">
                  <thead><tr><th>Roll No</th><th>Name</th><th>Course</th><th>Sem</th><th>Sec</th></tr></thead>
                  <tbody>
                    {parsed.slice(0, 8).map((r, i) => (
                      <tr key={i}><td>{r.rollNo || '—'}</td><td>{r.name}</td><td>{r.course || course || '—'}</td><td>{r.semester || semester || '—'}</td><td>{r.section || section || '—'}</td></tr>
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
