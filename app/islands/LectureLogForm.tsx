import { useEffect, useState } from 'hono/jsx'
import Icon from '../components/Icon'

// Attendance + "what I taught today", saved per lecture per date.
// The class roster can come from the saved Students list OR be uploaded right
// here as a CSV (handy when the list changes each time). Every student is
// Absent by default; tap to mark Present. A search box filters big classes.

type Log = {
  status: string
  present_count: number | null
  total_count: number | null
  topic: string | null
  remarks: string | null
  present_students: string | null
}
type Student = { id: string; roll_no: string | null; name: string }

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('rpl_token') ?? ''
  return { Authorization: `Bearer ${token}` }
}
function studentLabel(s: Student) {
  return s.roll_no ? `${s.roll_no} ${s.name}` : s.name
}

// Parse an uploaded CSV into students. Accepts "Roll,Name" or just "Name",
// with or without a header row.
function parseRosterCsv(text: string): Student[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (!lines.length) return []
  let start = 0
  const first = lines[0].toLowerCase()
  if (first.includes('name') || first.includes('roll')) start = 1 // header
  const out: Student[] = []
  for (let i = start; i < lines.length; i++) {
    const cells = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim())
    let roll: string | null = null
    let name = ''
    if (cells.length >= 2) {
      // Whichever cell has letters is the name; the other is the roll.
      if (/[a-zA-Z]/.test(cells[0]) && /^\d+$/.test(cells[1])) { name = cells[0]; roll = cells[1] }
      else { roll = cells[0] || null; name = cells.slice(1).join(' ').trim() }
    } else {
      name = cells[0]
    }
    if (!name) continue
    out.push({ id: `up-${i}`, roll_no: roll, name })
  }
  return out
}

export default function LectureLogForm({
  slotId,
  date,
  editable = true,
}: {
  slotId?: string
  date: string
  editable?: boolean
}) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [status, setStatus] = useState('conducted')
  const [total, setTotal] = useState('')
  const [topic, setTopic] = useState('')
  const [remarks, setRemarks] = useState('')
  const [existing, setExisting] = useState(false)

  const [roster, setRoster] = useState<Student[]>([])
  const [uploaded, setUploaded] = useState<Student[] | null>(null)
  const [present, setPresent] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  // Manual fallback (no roster & nothing uploaded)
  const [manual, setManual] = useState<string[]>([])
  const [manualInput, setManualInput] = useState('')

  useEffect(() => {
    if (!slotId) { setLoading(false); return }
    Promise.all([
      fetch(`/api/timetable/log?slotId=${encodeURIComponent(slotId)}&date=${date}`, { headers: authHeaders() })
        .then((r) => (r.ok ? r.json<{ log: Log | null }>() : null)).catch(() => null),
      fetch(`/api/timetable/roster?slotId=${encodeURIComponent(slotId)}`, { headers: authHeaders() })
        .then((r) => (r.ok ? r.json<{ students: Student[] }>() : null)).catch(() => null),
    ]).then(([logRes, rosterRes]) => {
      const students = rosterRes?.students ?? []
      setRoster(students)
      const l = logRes?.log
      if (l) {
        setExisting(true)
        setStatus(l.status ?? 'conducted')
        setTotal(l.total_count != null ? String(l.total_count) : '')
        setTopic(l.topic ?? '')
        setRemarks(l.remarks ?? '')
        const savedLines = (l.present_students ?? '').split('\n').map((s) => s.trim()).filter(Boolean)
        if (students.length) {
          const set = new Set<string>()
          for (const s of students) {
            const hit = savedLines.some((line) => line.toLowerCase().includes(s.name.toLowerCase()) || (s.roll_no && line.startsWith(s.roll_no)))
            if (hit) set.add(s.id)
          }
          setPresent(set)
        } else {
          setManual(savedLines)
        }
      }
      setLoading(false)
    })
  }, [])

  const effectiveRoster = uploaded ?? roster
  const hasRoster = effectiveRoster.length > 0

  const onUpload = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const list = parseRosterCsv(String(reader.result ?? ''))
      if (list.length === 0) { setMsg('Sheet me koi naam nahi mila.'); return }
      setUploaded(list)
      // Reconcile any already-marked present names onto the new list.
      const savedNames = roster.filter((s) => present.has(s.id)).map((s) => s.name.toLowerCase())
      const set = new Set<string>()
      for (const s of list) if (savedNames.includes(s.name.toLowerCase())) set.add(s.id)
      setPresent(set)
      setMsg(`${list.length} students loaded from sheet.`)
      setTimeout(() => setMsg(''), 2500)
    }
    reader.readAsText(file)
  }

  const toggle = (id: string) => {
    const next = new Set(present)
    next.has(id) ? next.delete(id) : next.add(id)
    setPresent(next)
  }
  const markAll = () => setPresent(new Set(effectiveRoster.map((s) => s.id)))
  const clearAll = () => setPresent(new Set())

  const addManual = () => {
    const names = manualInput.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)
    if (!names.length) return
    const merged = [...manual]
    for (const n of names) if (!merged.some((x) => x.toLowerCase() === n.toLowerCase())) merged.push(n)
    setManual(merged); setManualInput('')
  }
  const removeManual = (name: string) => setManual(manual.filter((s) => s !== name))

  const presentCount = hasRoster ? present.size : manual.length
  const totalCount = hasRoster ? effectiveRoster.length : total === '' ? null : Number(total)
  const pct = totalCount && totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : null

  const q = search.trim().toLowerCase()
  const filtered = q
    ? effectiveRoster.filter((s) => s.name.toLowerCase().includes(q) || (s.roll_no ?? '').toLowerCase().includes(q))
    : effectiveRoster

  const save = async () => {
    if (!slotId) return
    setSaving(true); setMsg('')
    const presentStudents = hasRoster
      ? effectiveRoster.filter((s) => present.has(s.id)).map(studentLabel).join('\n')
      : manual.join('\n')
    try {
      const res = await fetch('/api/timetable/log', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId, date, status, presentCount, totalCount, topic, remarks, presentStudents }),
      })
      if (res.ok) { setExisting(true); setMsg('Saved ✓') }
      else if (res.status === 403) setMsg('You can only log your own lectures.')
      else setMsg('Could not save — try again.')
    } catch { setMsg('Network error — try again.') }
    finally { setSaving(false); setTimeout(() => setMsg(''), 3500) }
  }

  if (!slotId) return null
  if (loading) return <div className="tt-log tt-log-loading">Loading lecture log…</div>

  // ---- Read-only (HR / master) ----
  if (!editable) {
    const names = hasRoster ? effectiveRoster.filter((s) => present.has(s.id)).map(studentLabel) : manual
    return (
      <div className="tt-log">
        <div className="tt-log-title"><Icon name="check-square" size={14} /> Lecture Log</div>
        {existing ? (
          <dl className="tt-log-ro">
            <div><dt>Status</dt><dd>{status === 'cancelled' ? 'Cancelled' : 'Conducted'}</dd></div>
            <div><dt>Attendance</dt><dd>{presentCount} / {totalCount ?? '—'}{pct != null ? ` (${pct}%)` : ''}</dd></div>
            <div><dt>Topic</dt><dd>{topic || '—'}</dd></div>
            {remarks && <div><dt>Remarks</dt><dd>{remarks}</dd></div>}
            {names.length > 0 && (
              <div class="tt-log-ro-wide"><dt>Present Students ({names.length})</dt>
                <dd><div className="tt-chips">{names.map((s) => <span className="tt-chip-name" key={s}>{s}</span>)}</div></dd></div>
            )}
          </dl>
        ) : <p className="tt-log-empty">No log recorded for this date.</p>}
      </div>
    )
  }

  return (
    <div className="tt-log">
      <div className="tt-log-title">
        <Icon name="check-square" size={14} /> Take Attendance &amp; Lesson Log
        <span className="tt-log-date">{date}</span>
      </div>

      <div className="tt-log-row">
        <label className="tt-tb-field"><span>Status</span>
          <select value={status} onChange={(e) => setStatus((e.target as HTMLSelectElement).value)}>
            <option value="conducted">Conducted</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <div className="tt-tb-field"><span>Present</span><div className="tt-log-count">{presentCount}</div></div>
        <label className="tt-tb-field"><span>Total</span>
          {hasRoster ? <div className="tt-log-count">{totalCount}</div>
            : <input type="number" min="0" value={total} placeholder="e.g. 58" onInput={(e) => setTotal((e.target as HTMLInputElement).value)} />}
        </label>
        <div className="tt-log-pct">{pct != null ? `${pct}%` : '—'}</div>
      </div>

      {/* Roster controls: upload sheet + (if present) search + mark all */}
      <div className="tt-roster-bar">
        <label className="tt-mini-btn tt-file-btn">
          <Icon name="download" size={13} /> {uploaded ? 'Re-upload sheet' : 'Upload sheet'}
          <input type="file" accept=".csv,text/csv" hidden onChange={onUpload} />
        </label>
        {uploaded && <button type="button" className="tt-mini-btn" onClick={() => { setUploaded(null); setPresent(new Set()) }}>Use saved list</button>}
        {hasRoster && (
          <>
            <button type="button" className="tt-mini-btn" onClick={markAll}>All Present</button>
            <button type="button" className="tt-mini-btn" onClick={clearAll}>Clear</button>
          </>
        )}
      </div>

      {hasRoster ? (
        <div className="tt-tb-field">
          <div className="tt-roster-searchbar">
            <span className="tt-roster-count"><strong>{present.size}</strong> / {effectiveRoster.length} present</span>
            <div className="tt-search">
              <Icon name="search" size={14} />
              <input value={search} placeholder="Search name or roll…" onInput={(e) => setSearch((e.target as HTMLInputElement).value)} />
            </div>
          </div>
          <div className="tt-roster">
            {filtered.map((s) => (
              <button type="button" key={s.id}
                className={`tt-roster-item ${present.has(s.id) ? 'is-present' : 'is-absent'}`}
                onClick={() => toggle(s.id)}>
                <span className="tt-roster-mark">{present.has(s.id) ? 'P' : 'A'}</span>
                {s.roll_no && <span className="tt-roster-roll">{s.roll_no}</span>}
                <span className="tt-roster-name">{s.name}</span>
              </button>
            ))}
            {filtered.length === 0 && <div className="tt-empty">No match.</div>}
          </div>
        </div>
      ) : (
        <div className="tt-tb-field">
          <span>Present Students {manual.length > 0 ? `(${manual.length})` : ''} — ya upar se sheet upload karo</span>
          <div className="tt-student-add">
            <input value={manualInput} placeholder="Type a present student's name and press Enter"
              onInput={(e) => setManualInput((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => { if ((e as KeyboardEvent).key === 'Enter') { e.preventDefault(); addManual() } }} />
            <button type="button" className="tt-today-btn" onClick={addManual}><Icon name="check" size={14} /> Add</button>
          </div>
          {manual.length > 0 && (
            <div className="tt-chips">
              {manual.map((s) => (
                <span className="tt-chip-name is-removable" key={s}>{s}
                  <button type="button" onClick={() => removeManual(s)} aria-label={`Remove ${s}`}><Icon name="x" size={11} /></button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <label className="tt-tb-field"><span>What did you teach today?</span>
        <input value={topic} placeholder="Topic covered — e.g. Consumer Behaviour, Chapter 4" onInput={(e) => setTopic((e.target as HTMLInputElement).value)} /></label>
      <label className="tt-tb-field"><span>Remarks (optional)</span>
        <input value={remarks} placeholder="Any note about this lecture" onInput={(e) => setRemarks((e.target as HTMLInputElement).value)} /></label>

      <div className="tt-log-actions">
        <button type="button" className="btn-primary" disabled={saving} onClick={save}>
          <Icon name="check" size={15} /> {saving ? 'Saving…' : existing ? 'Update Log' : 'Save Log'}
        </button>
        {msg && <span className="tt-log-msg">{msg}</span>}
      </div>
    </div>
  )
}
