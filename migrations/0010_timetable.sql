-- Timetable module: subjects, classrooms and lecture slots.

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  code TEXT,
  name TEXT NOT NULL,
  colour TEXT NOT NULL DEFAULT 'blue',
  department TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);

CREATE TABLE IF NOT EXISTS classrooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  building TEXT,
  capacity INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);

CREATE TABLE IF NOT EXISTS timetable_slots (
  id TEXT PRIMARY KEY,
  faculty_id TEXT,
  subject_id TEXT,
  classroom_id TEXT,
  day INTEGER NOT NULL,            -- 1 = Mon … 7 = Sun
  start_time TEXT NOT NULL,        -- 'HH:MM'
  end_time TEXT NOT NULL,          -- 'HH:MM'
  department TEXT,
  course TEXT,
  semester TEXT,
  section TEXT,
  lecture_type TEXT NOT NULL DEFAULT 'Theory',
  status TEXT NOT NULL DEFAULT 'draft',   -- draft | published
  notes TEXT,
  academic_year TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_tt_faculty ON timetable_slots (faculty_id);
CREATE INDEX IF NOT EXISTS idx_tt_day ON timetable_slots (day);

-- ---- Seed master data ----
INSERT OR IGNORE INTO subjects (id, code, name, colour, department) VALUES
  ('sub-mkt',  'MKT101', 'Marketing',            'blue',   'Commerce & Management'),
  ('sub-hr',   'HRM201', 'HR Management',        'green',  'Commerce & Management'),
  ('sub-fin',  'FIN101', 'Finance',              'orange', 'Commerce & Management'),
  ('sub-mm',   'MKT301', 'Marketing Management', 'orange', 'Commerce & Management'),
  ('sub-dm',   'DGM201', 'Digital Marketing',    'purple', 'Commerce & Management'),
  ('sub-lab',  'CSL101', 'Computer Lab',         'pink',   'Computer Applications');

INSERT OR IGNORE INTO classrooms (id, name, building, capacity) VALUES
  ('room-108', 'Room 108', 'Main Building', 60),
  ('room-205', 'Room 205', 'Main Building', 70),
  ('room-210', 'Room 210', 'Main Building', 45),
  ('lab-1',    'Lab 1',    'IT Block',      40),
  ('lab-2',    'Lab 2',    'IT Block',      40);

-- ---- Seed a sample published week for one faculty ----
INSERT OR IGNORE INTO timetable_slots
  (id, faculty_id, subject_id, classroom_id, day, start_time, end_time, department, course, semester, section, lecture_type, status, academic_year)
SELECT 'tt-' || x.n, u.id, x.sub, x.room, x.day, x.st, x.en,
       'Commerce & Management', x.course, x.sem, x.sec, x.typ, 'published', '2026-27'
FROM users u
JOIN (
  SELECT  1 AS n, 'sub-mkt' AS sub, 'room-205' AS room, 1 AS day, '09:00' AS st, '10:00' AS en, 'BBA' AS course, 'Sem III' AS sem, 'A' AS sec, 'Theory' AS typ
  UNION ALL SELECT  2, 'sub-dm',  'room-108', 1, '10:00', '11:00', 'BBA', 'Sem V',   'B', 'Theory'
  UNION ALL SELECT  3, 'sub-fin', 'room-210', 1, '11:00', '12:00', 'MBA', 'Sem I',   'A', 'Theory'
  UNION ALL SELECT  4, 'sub-hr',  'room-205', 1, '13:30', '14:30', 'BBA', 'Sem III', 'A', 'Theory'
  UNION ALL SELECT  5, 'sub-fin', 'room-210', 2, '09:00', '10:00', 'MBA', 'Sem I',   'A', 'Theory'
  UNION ALL SELECT  6, 'sub-mkt', 'room-205', 2, '10:00', '11:00', 'BBA', 'Sem III', 'A', 'Theory'
  UNION ALL SELECT  7, 'sub-lab', 'lab-2',    2, '13:30', '15:30', 'BCA', 'Sem III', 'A', 'Practical'
  UNION ALL SELECT  8, 'sub-mkt', 'room-205', 3, '09:00', '10:00', 'BBA', 'Sem III', 'A', 'Theory'
  UNION ALL SELECT  9, 'sub-hr',  'room-108', 3, '10:00', '11:00', 'BBA', 'Sem V',   'B', 'Theory'
  UNION ALL SELECT 10, 'sub-dm',  'room-108', 3, '11:00', '12:00', 'BBA', 'Sem V',   'B', 'Theory'
  UNION ALL SELECT 11, 'sub-fin', 'room-210', 3, '13:30', '14:30', 'MBA', 'Sem I',   'A', 'Tutorial'
  UNION ALL SELECT 12, 'sub-mm',  'room-205', 3, '14:30', '15:30', 'MBA', 'Sem I',   'A', 'Theory'
  UNION ALL SELECT 13, 'sub-mkt', 'room-205', 4, '10:00', '11:00', 'BBA', 'Sem III', 'A', 'Theory'
  UNION ALL SELECT 14, 'sub-hr',  'room-205', 4, '13:30', '14:30', 'BBA', 'Sem III', 'A', 'Theory'
  UNION ALL SELECT 15, 'sub-dm',  'room-108', 5, '09:00', '10:00', 'BBA', 'Sem V',   'B', 'Theory'
  UNION ALL SELECT 16, 'sub-fin', 'room-210', 5, '10:00', '11:00', 'MBA', 'Sem I',   'A', 'Theory'
  UNION ALL SELECT 17, 'sub-mkt', 'room-205', 5, '11:00', '12:00', 'BBA', 'Sem III', 'A', 'Theory'
  UNION ALL SELECT 18, 'sub-lab', 'lab-2',    5, '14:30', '16:30', 'BCA', 'Sem III', 'A', 'Practical'
  UNION ALL SELECT 19, 'sub-mkt', 'room-205', 6, '09:00', '10:00', 'BBA', 'Sem III', 'A', 'Theory'
  UNION ALL SELECT 20, 'sub-dm',  'room-108', 6, '10:00', '11:00', 'BBA', 'Sem V',   'B', 'Theory'
) x
WHERE lower(u.email) = 'devendra.nagwanshi@rplmaheshwari.com';
