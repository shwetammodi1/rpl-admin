// Client-side timetable service. Keeps the islands free of fetch/mapping
// details and returns the same shapes the UI already renders.

import type { Lecture } from './timetable'

export type AdminSlot = {
  id: string
  faculty_id: string | null
  subject_id: string | null
  classroom_id: string | null
  day: number
  start_time: string
  end_time: string
  department: string | null
  course: string | null
  semester: string | null
  section: string | null
  lecture_type: string
  status: string
  notes: string | null
  academic_year: string | null
  subject: string | null
  colour: string | null
  room: string | null
  building: string | null
  faculty: string | null
}

export type MasterData = {
  subjects: { id: string; code: string | null; name: string; colour: string; department: string | null }[]
  classrooms: { id: string; name: string; building: string | null; capacity: number | null }[]
  faculty: { id: string; name: string; department: string | null; designation: string | null }[]
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('rpl_token') ?? ''
  return { Authorization: `Bearer ${token}` }
}

/** Map a DB row to the Lecture shape the UI components render. */
export function toLecture(r: AdminSlot): Lecture {
  return {
    day: r.day,
    start: r.start_time,
    end: r.end_time,
    subject: r.subject ?? 'Lecture',
    colour: r.colour ?? 'gray',
    room: r.room ?? '—',
    building: r.building ?? '—',
    section: [r.course, r.semester, r.section].filter(Boolean).join(' ') || '—',
    semester: r.semester ?? '—',
    type: r.lecture_type ?? 'Theory',
    faculty: r.faculty ?? '—',
    department: r.department ?? '—',
    students: 0,
    attendance: 'pending',
  }
}

/** The signed-in user's own published timetable. */
export async function fetchMyTimetable(): Promise<Lecture[]> {
  const res = await fetch('/api/timetable/my', { headers: authHeaders() })
  if (!res.ok) return []
  const data = await res.json<{ lectures: AdminSlot[] }>()
  return (data.lectures ?? []).map(toLecture)
}

/** College-wide slots (admin). */
export async function fetchAdminSlots(params: Record<string, string> = {}): Promise<AdminSlot[]> {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString()
  const res = await fetch(`/api/admin/timetable${qs ? `?${qs}` : ''}`, { headers: authHeaders() })
  if (!res.ok) return []
  const data = await res.json<{ slots: AdminSlot[] }>()
  return data.slots ?? []
}

/** Dropdown data for admin screens. */
export async function fetchMasterData(): Promise<MasterData | null> {
  const res = await fetch('/api/admin/timetable/master-data', { headers: authHeaders() })
  if (!res.ok) return null
  return res.json<MasterData>()
}
