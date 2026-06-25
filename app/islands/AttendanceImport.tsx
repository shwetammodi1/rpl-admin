import { useState } from 'hono/jsx'
import Icon from '../components/Icon'

type Punch = { time: string; dir: 'in' | 'out' | null }
type Row = { date: string; payCode: string; name: string; punches: Punch[] }
type Summary = { employees: number; employeesCreated: number; punchesAdded: number; duplicates: number; skipped: number }

// Split one CSV line, honouring "quoted, fields".
function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else inQ = false
      } else cur += ch
    } else if (ch === '"') inQ = true
    else if (ch === ',') {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out
}

// DD/MM/YYYY (or DD-MM-YYYY) -> YYYY-MM-DD
function toIsoDate(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/)
  if (!m) return null
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

// "08:03:00 - I"  ->  { time: '08:03:00', dir: 'in' }
function parsePunchCell(cell: string): Punch | null {
  const m = (cell ?? '').match(/(\d{1,2}:\d{2}(?::\d{2})?)\s*-\s*([IOio])/)
  if (!m) return null
  let time = m[1]
  if (time.split(':').length === 2) time += ':00'
  return { time, dir: m[2].toLowerCase() === 'o' ? 'out' : 'in' }
}

function parseCsv(text: string): { rows: Row[]; error?: string } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length === 0) return { rows: [], error: 'File khaali hai.' }

  let headerIdx = lines.findIndex((l) => /pay\s*code/i.test(l) && /date/i.test(l))
  if (headerIdx === -1) headerIdx = 0
  const headers = parseCsvLine(lines[headerIdx]).map((h) => h.trim().toLowerCase())

  const dateIdx = headers.findIndex((h) => h === 'date')
  const payIdx = headers.findIndex((h) => h.includes('pay'))
  const nameIdx = headers.findIndex((h) => h.includes('name'))
  const punchIdxs = headers.map((h, i) => (h.startsWith('punch') ? i : -1)).filter((i) => i >= 0)

  if (dateIdx === -1 || payIdx === -1 || punchIdxs.length === 0) {
    return { rows: [], error: 'Columns nahi mile (Date / Pay Code / Punch). Kya yeh "Machine Raw Punch All" / "In-Out" report ka CSV hai?' }
  }

  const rows: Row[] = []
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i])
    const date = toIsoDate(cells[dateIdx] ?? '')
    const payCode = (cells[payIdx] ?? '').trim()
    if (!date || !payCode) continue
    const punches = punchIdxs
      .map((idx) => parsePunchCell(cells[idx] ?? ''))
      .filter((p): p is Punch => p !== null)
    if (punches.length === 0) continue
    rows.push({ date, payCode, name: nameIdx >= 0 ? (cells[nameIdx] ?? '').trim() : '', punches })
  }
  return { rows }
}

export default function AttendanceImport() {
  const [rows, setRows] = useState<Row[]>([])
  const [fileName, setFileName] = useState('')
  const [parseError, setParseError] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [result, setResult] = useState<Summary | null>(null)

  const onFile = async (e: Event) => {
    setResult(null)
    setParseError('')
    setRows([])
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    setFileName(file.name)
    if (!/\.csv$/i.test(file.name)) {
      setParseError('Sirf .csv file chalegi. Excel me file kholke "Save As → CSV" karein, phir upload karein.')
      return
    }
    const text = await file.text()
    const parsed = parseCsv(text)
    if (parsed.error) {
      setParseError(parsed.error)
      return
    }
    if (parsed.rows.length === 0) {
      setParseError('Koi punch row nahi mili is file me.')
      return
    }
    setRows(parsed.rows)
  }

  const upload = async () => {
    if (rows.length === 0) return
    const token = localStorage.getItem('rpl_token')
    if (!token) {
      setParseError('Login session nahi mila — dobara login karein.')
      return
    }
    setBusy(true)
    setResult(null)
    const total: Summary = { employees: 0, employeesCreated: 0, punchesAdded: 0, duplicates: 0, skipped: 0 }
    const CHUNK = 20
    try {
      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK)
        setProgress(`Bhej rahe hain… ${Math.min(i + CHUNK, rows.length)} / ${rows.length} rows`)
        const res = await fetch('/api/admin/attendance/import', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: chunk }),
        })
        const j = (await res
          .json<Partial<Summary> & { error?: string }>()
          .catch(() => ({}))) as Partial<Summary> & { error?: string }
        if (!res.ok) {
          setParseError(j.error ?? `Upload fail (HTTP ${res.status})`)
          setBusy(false)
          return
        }
        total.employeesCreated += j.employeesCreated ?? 0
        total.punchesAdded += j.punchesAdded ?? 0
        total.duplicates += j.duplicates ?? 0
        total.skipped += j.skipped ?? 0
      }
      const codes = new Set(rows.map((r) => r.payCode))
      total.employees = codes.size
      setResult(total)
      setProgress('')
    } catch {
      setParseError('Network error — dobara try karein.')
    } finally {
      setBusy(false)
    }
  }

  const punchCount = rows.reduce((n, r) => n + r.punches.length, 0)
  const empCount = new Set(rows.map((r) => r.payCode)).size

  return (
    <div className="admin-card import-card">
      <div className="import-body">
        <ol className="import-steps">
          <li>TimeWatch me <b>Daily Reports → Machine Raw Punch All</b> (ya In-Out) generate karein.</li>
          <li><b>Export to Excel</b>, phir Excel me <b>File → Save As → CSV</b> karein.</li>
          <li>Woh <b>.csv</b> file yahan upload karein.</li>
        </ol>

        <label className="import-file">
          <Icon name="download" size={16} />
          <span>{fileName || 'CSV file chunein…'}</span>
          <input type="file" accept=".csv,text/csv" onChange={onFile} hidden />
        </label>

        {parseError && (
          <div className="import-alert is-error">
            <Icon name="alert" size={16} /> {parseError}
          </div>
        )}

        {rows.length > 0 && !result && (
          <div className="import-preview">
            <div className="import-stat">
              <span className="import-stat-num">{empCount}</span>
              <span className="import-stat-label">Employees</span>
            </div>
            <div className="import-stat">
              <span className="import-stat-num">{rows.length}</span>
              <span className="import-stat-label">Days with punches</span>
            </div>
            <div className="import-stat">
              <span className="import-stat-num">{punchCount}</span>
              <span className="import-stat-label">Punches</span>
            </div>
          </div>
        )}

        {rows.length > 0 && !result && (
          <button type="button" className="btn-primary import-go" onClick={upload} disabled={busy}>
            {busy ? progress || 'Importing…' : `Import ${rows.length} days`}
          </button>
        )}

        {result && (
          <div className="import-alert is-success">
            <Icon name="check-circle" size={16} />
            <div>
              <b>Import ho gaya!</b>
              <div className="import-result-grid">
                <span>Naye employees: <b>{result.employeesCreated}</b></span>
                <span>Punches added: <b>{result.punchesAdded}</b></span>
                <span>Pehle se the (duplicate): <b>{result.duplicates}</b></span>
                {result.skipped > 0 && <span>Skipped: <b>{result.skipped}</b></span>}
              </div>
              <a className="import-link" href="/hr/attendance">Attendance Calendar me dekhein →</a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
