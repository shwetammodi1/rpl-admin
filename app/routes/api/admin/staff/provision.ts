import { createRoute } from '../../../../lib/factory'
import { verifyJWT, requireRole } from '../../../../lib/jwt'
import { hashPassword } from '../../../../lib/password'

type Staff = { ref?: string; name: string; email: string; designation: string; degrees: string }

// Canonical faculty/staff list (from the college staff details). `ref` = TimeWatch
// Pay Code (biometric_ref) for those already present from the attendance import;
// entries without a ref are created fresh.
const STAFF: Staff[] = [
  { ref: '7', name: 'Devendra Nagwanshi', email: 'Devendra.nagwanshi@rplmaheshwari.com', designation: 'Assistant Professor', degrees: 'MBA, MSW, M.Phil, LLB' },
  { ref: '123', name: 'Dharmendra Thakur', email: 'Dharmendra.thakur@rplmaheshwari.com', designation: 'Assistant Professor', degrees: 'B.Com, B.P.Ed., M.P.Ed., Ph.D. (Pursuing)' },
  { ref: '106', name: 'Chetan Joshi', email: 'Chetan.joshi@rplmaheshwari.com', designation: 'Assistant Professor', degrees: 'Ph.D., M.Phil, M.Com' },
  { ref: '105', name: 'Rajshree Narwane', email: 'Rajshree.narwane@rplmaheshwari.com', designation: 'Assistant Professor', degrees: 'Ph.D.' },
  { ref: '156', name: 'Sonali Gupta', email: 'Sonali.gupta@rplmaheshwari.com', designation: 'Assistant Professor', degrees: 'Ph.D., M.Com, B.Ed' },
  { ref: '4', name: 'Akhil Kumar Dubey', email: 'Akhil.dubey@rplmaheshwari.com', designation: 'Associate Professor', degrees: 'M.Com, M.Phil, Ph.D.' },
  { ref: '102', name: 'Anjana Gorani', email: 'Anjana.gorani@rplmaheshwari.com', designation: 'Assistant Professor', degrees: 'M.Com, Ph.D.' },
  { ref: '107', name: 'Vikas Joshi', email: 'Vikas.joshi@rplmaheshwari.com', designation: 'Assistant Professor', degrees: 'Ph.D., MBA, B.Ed, M.Com' },
  { ref: '149', name: 'Vinayak Khare', email: 'Vinayak.khare@rplmaheshwari.com', designation: 'Associate Professor', degrees: 'Ph.D., MBA, PGDCM, B.Sc' },
  { ref: '152', name: 'Manish Ranade', email: 'Manish.ranade@rplmaheshwari.com', designation: 'Assistant Professor', degrees: 'B.Com, M.Com' },
  { ref: '120', name: 'Laxmi Yadav', email: 'Laxmi.yadav@rplmaheshwari.com', designation: 'Assistant Professor', degrees: 'M.Com, M.Phil, M.Ed, PGDCA, Ph.D. (Pursuing)' },
  { ref: '117', name: 'Payal Menghani', email: 'Payal.menghani@rplmaheshwari.com', designation: 'Assistant Professor', degrees: 'B.Com, MBA, MA' },
  { ref: '155', name: 'Shristi Shrivastava', email: 'Shristi.shrivastava@rplmaheshwari.com', designation: 'Assistant Professor', degrees: 'B.A., M.A, B.Ed' },
  { ref: '111', name: 'Shankar Singh Chouhan', email: 'Shankar.chouhan@rplmaheshwari.com', designation: 'Assistant Professor', degrees: 'M.Phil, Ph.D. (Pursuing)' },
  { ref: '150', name: 'Ankit Bagdi', email: 'Ankit.bagdi@rplmaheshwari.com', designation: 'Assistant Professor', degrees: 'B.Com, MBA, Ph.D. (Pursuing), UGC NET' },
  { ref: '5', name: 'Ritesh Joshi', email: 'Ritesh.joshi@rplmaheshwari.com', designation: 'Office Assistant', degrees: 'B.Com (Computer Application), MBA' },
  { ref: '133', name: 'Himanshu Agrawal', email: 'Himanshu.agrawal@rplmaheshwari.com', designation: 'Office Assistant', degrees: 'Higher Diploma in Software Engineering' },
  { ref: '8', name: 'Deepika Pandeya', email: 'Deepika.pandeya@rplmaheshwari.com', designation: 'Office Assistant', degrees: 'M.A, B.Lib, PGDCA' },
  { ref: '130', name: 'Kajal Bajaj', email: 'Kajal.bajaj@rplmaheshwari.com', designation: 'Office Assistant', degrees: 'Post Graduation' },
  { ref: '128', name: 'Leena Jog', email: 'Leena.jog@rplmaheshwari.com', designation: 'Office Assistant (Asst. Librarian)', degrees: 'M.A, M.Lib I.Sc.' },
  { name: 'Krishna Gour', email: 'Krishna.gour@rplmaheshwari.com', designation: 'Assistant Professor', degrees: 'B.Sc, MCA, UGC NET' },
  { name: 'Neha Solanki', email: 'Neha.solanki@rplmaheshwari.com', designation: 'Assistant Professor', degrees: 'MPSET 2024, M.A, B.Sc.' },
  { name: 'Shraddha Verma', email: 'Shraddha.verma@rplmaheshwari.com', designation: 'Assistant Professor', degrees: 'M.Com, LLB, UGC NET, MPSET' },
  { name: 'Venus Rathore', email: 'Venus.rathore@rplmaheshwari.com', designation: 'Assistant Professor', degrees: 'BCA, MCA' },
]

const PW_CHARS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function genPassword(): string {
  const arr = crypto.getRandomValues(new Uint8Array(8))
  let s = ''
  for (const b of arr) s += PW_CHARS[b % PW_CHARS.length]
  return `Rpl@${s}`
}

type ExistingUser = { id: string; email: string | null; password_hash: string | null }

// Master provisions login accounts for all faculty/staff: business email,
// a unique password, faculty role, designation + degrees. Existing accounts that
// already have a real password are left untouched (only profile fields refreshed),
// so re-running never resets a password that's already in use.
export const POST = createRoute(verifyJWT, requireRole('master'), async (c) => {
  const db = c.env.DB
  const out: { name: string; email: string; password: string; status: 'created' | 'updated' | 'kept' }[] = []

  for (const s of STAFF) {
    let user: ExistingUser | null = null
    if (s.ref) {
      user = await db
        .prepare('SELECT id, email, password_hash FROM users WHERE biometric_ref = ?')
        .bind(s.ref)
        .first<ExistingUser>()
    }
    if (!user) {
      user = await db
        .prepare('SELECT id, email, password_hash FROM users WHERE lower(name) = lower(?)')
        .bind(s.name)
        .first<ExistingUser>()
    }

    const provisioned =
      user && user.password_hash && user.password_hash !== '!imported' && (user.email ?? '').endsWith('@rplmaheshwari.com')

    if (provisioned && user) {
      await db
        .prepare("UPDATE users SET role = 'faculty', designation = ?, degrees = ? WHERE id = ?")
        .bind(s.designation, s.degrees, user.id)
        .run()
      out.push({ name: s.name, email: user.email ?? s.email, password: '(already set)', status: 'kept' })
      continue
    }

    const password = genPassword()
    const hash = await hashPassword(password)

    if (user) {
      await db
        .prepare("UPDATE users SET email = ?, password_hash = ?, role = 'faculty', designation = ?, degrees = ? WHERE id = ?")
        .bind(s.email, hash, s.designation, s.degrees, user.id)
        .run()
      out.push({ name: s.name, email: s.email, password, status: 'updated' })
    } else {
      await db
        .prepare(
          "INSERT INTO users (id, name, email, password_hash, role, designation, degrees, biometric_ref) VALUES (?, ?, ?, ?, 'faculty', ?, ?, ?)"
        )
        .bind(crypto.randomUUID(), s.name, s.email, hash, s.designation, s.degrees, s.ref ?? null)
        .run()
      out.push({ name: s.name, email: s.email, password, status: 'created' })
    }
  }

  return c.json({
    total: out.length,
    created: out.filter((o) => o.status === 'created').length,
    updated: out.filter((o) => o.status === 'updated').length,
    kept: out.filter((o) => o.status === 'kept').length,
    accounts: out,
  })
})
