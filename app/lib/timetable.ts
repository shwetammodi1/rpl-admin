// Shared timetable types, constants and utils.
// PHASE 4-5: the LECTURES array is static dummy data — Phase 7 replaces it
// with the real API while these types/utils stay unchanged.

export type Lecture = {
  id?: string // timetable_slots.id (present for real data; used to log a lecture)
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

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const SLOTS: { start: string; end: string; lunch?: boolean }[] = [
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

export const LECTURES: Lecture[] = [
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

export const LEGEND = [
  { label: 'Marketing', colour: 'blue' },
  { label: 'HR', colour: 'green' },
  { label: 'Finance', colour: 'orange' },
  { label: 'Lab', colour: 'pink' },
  { label: 'Digital Marketing', colour: 'purple' },
  { label: 'Free Period', colour: 'gray' },
]

// Dummy non-teaching days (day-of-month based so they always appear in view).
export const HOLIDAY_DATE = 15
export const LEAVE_DATE = 22

// ---- Master data (dummy for now; Phase 7 loads these from the API) ----
export const SUBJECTS = [
  { name: 'Marketing', colour: 'blue' },
  { name: 'HR Management', colour: 'green' },
  { name: 'Finance', colour: 'orange' },
  { name: 'Marketing Management', colour: 'orange' },
  { name: 'Digital Marketing', colour: 'purple' },
  { name: 'Computer Lab', colour: 'pink' },
]
export const FACULTY_LIST = [
  'Devendra Nagwanshi',
  'Dr. Anjana Gorani',
  'Dr. Chetan Joshi',
  'Prof. Vikas Joshi',
  'Prof. Manish Ranade',
  'Krishna Gour',
]
export const DEPARTMENTS = ['Commerce & Management', 'Computer Applications', 'Science']
export const COURSES = ['BBA', 'BCA', 'B.Com', 'MBA']
// Class is identified by Course + Year + Section. The DB column is still named
// `semester` but holds the year value (e.g. "2nd Year").
export const YEARS = ['1st Year', '2nd Year', '3rd Year']
export const SEMESTERS = YEARS // back-compat alias
export const SECTIONS = ['A', 'B', 'C']
export const BUILDINGS = ['Main Building', 'IT Block']
export const ROOMS = ['Room 108', 'Room 205', 'Room 210', 'Lab 1', 'Lab 2']
export const LECTURE_TYPES = ['Theory', 'Practical', 'Lab', 'Tutorial']
export const ACADEMIC_YEARS = ['2026-27', '2025-26']

export function colourOf(subject: string) {
  return SUBJECTS.find((s) => s.name === subject)?.colour ?? 'gray'
}

export function fmt12(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hh = h % 12 === 0 ? 12 : h % 12
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`
}

export function mondayOf(offset: number) {
  const d = new Date()
  const shift = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - shift + offset * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

export function fmtDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

/** Local date as 'YYYY-MM-DD' (no timezone shift). */
export function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** Weekday index 1..7 (Mon..Sun) for a date. */
export function weekdayOf(d: Date) {
  return ((d.getDay() + 6) % 7) + 1
}

/** Lectures for a given date, honouring holiday/leave/week-off rules. */
export function lecturesOn(d: Date, source: Lecture[] = LECTURES): Lecture[] {
  const wd = weekdayOf(d)
  if (wd === 7) return []
  if (d.getDate() === HOLIDAY_DATE || d.getDate() === LEAVE_DATE) return []
  return source.filter((l) => l.day === wd).sort((a, b) => a.start.localeCompare(b.start))
}

export function dayKind(d: Date): 'holiday' | 'leave' | 'off' | 'normal' {
  if (d.getDate() === HOLIDAY_DATE) return 'holiday'
  if (d.getDate() === LEAVE_DATE) return 'leave'
  if (weekdayOf(d) === 7) return 'off'
  return 'normal'
}
