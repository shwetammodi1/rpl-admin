-- Composite indexes for the two hot timetable queries:
--   /api/timetable/my       -> WHERE faculty_id = ? AND status = 'published'
--   conflict check + grids  -> WHERE day = ? (then ordered by start_time)
CREATE INDEX IF NOT EXISTS idx_tt_faculty_status ON timetable_slots (faculty_id, status);
CREATE INDEX IF NOT EXISTS idx_tt_day_start ON timetable_slots (day, start_time);
