// Timetable conflict rules (server-side, authoritative).
// A clash exists when two lectures on the same day overlap in time AND share
// the same faculty, the same classroom, or the same class (course+sem+section).

export type ConflictKind = 'faculty' | 'room' | 'section'

export type Conflict = {
  id: string
  kind: ConflictKind
  subject: string | null
  faculty: string | null
  room: string | null
  start: string
  end: string
  klass: string
}

export type Candidate = {
  day: number
  startTime: string
  endTime: string
  facultyId?: string | null
  classroomId?: string | null
  course?: string | null
  semester?: string | null
  section?: string | null
}

type Row = {
  id: string
  start_time: string
  end_time: string
  faculty_id: string | null
  classroom_id: string | null
  course: string | null
  semester: string | null
  section: string | null
  subject: string | null
  faculty: string | null
  room: string | null
}

/** Two [start,end) ranges overlap. */
export function timeOverlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart < bEnd && aEnd > bStart
}

export async function findConflicts(
  db: D1Database,
  slot: Candidate,
  excludeId?: string
): Promise<Conflict[]> {
  const { results } = await db
    .prepare(
      `SELECT t.id, t.start_time, t.end_time, t.faculty_id, t.classroom_id,
              t.course, t.semester, t.section,
              s.name AS subject, u.name AS faculty, c.name AS room
         FROM timetable_slots t
         LEFT JOIN subjects   s ON s.id = t.subject_id
         LEFT JOIN users      u ON u.id = t.faculty_id
         LEFT JOIN classrooms c ON c.id = t.classroom_id
        WHERE t.day = ? AND t.id <> ?`
    )
    .bind(slot.day, excludeId ?? '')
    .all<Row>()

  const out: Conflict[] = []
  for (const r of results) {
    if (!timeOverlaps(slot.startTime, slot.endTime, r.start_time, r.end_time)) continue

    let kind: ConflictKind | null = null
    if (slot.facultyId && r.faculty_id === slot.facultyId) kind = 'faculty'
    else if (slot.classroomId && r.classroom_id === slot.classroomId) kind = 'room'
    else if (
      slot.course && slot.semester && slot.section &&
      r.course === slot.course && r.semester === slot.semester && r.section === slot.section
    ) kind = 'section'

    if (kind) {
      out.push({
        id: r.id,
        kind,
        subject: r.subject,
        faculty: r.faculty,
        room: r.room,
        start: r.start_time,
        end: r.end_time,
        klass: [r.course, r.semester, r.section].filter(Boolean).join(' '),
      })
    }
  }
  return out
}
