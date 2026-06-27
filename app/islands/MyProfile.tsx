import { useEffect, useState } from 'hono/jsx'
import Icon from '../components/Icon'

type Profile = {
  name: string
  email: string
  role: string
  department: string | null
  designation: string | null
  degrees: string | null
  photo: string | null
  bio: string | null
  phone: string | null
  research_papers: string | null
  books_authored: string | null
  patents: string | null
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function MyProfile() {
  const [authChecked, setAuthChecked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [p, setP] = useState<Profile | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [degrees, setDegrees] = useState('')
  const [papers, setPapers] = useState('')
  const [books, setBooks] = useState('')
  const [patents, setPatents] = useState('')
  const [bio, setBio] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const token = () => localStorage.getItem('rpl_token') ?? ''

  useEffect(() => {
    if (!token()) {
      window.location.href = '/'
      return
    }
    fetch('/api/profile', { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => (r.ok ? r.json<Profile>() : null))
      .then((data) => {
        if (!data) {
          window.location.href = '/'
          return
        }
        setP(data)
        setPhoto(data.photo)
        setDegrees(data.degrees ?? '')
        setPapers(data.research_papers ?? '')
        setBooks(data.books_authored ?? '')
        setPatents(data.patents ?? '')
        setBio(data.bio ?? '')
        setPhone(data.phone ?? '')
        setAuthChecked(true)
        setLoading(false)
      })
      .catch(() => {
        window.location.href = '/'
      })
  }, [])

  const onPhoto = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const size = 256
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        const min = Math.min(img.width, img.height)
        const sx = (img.width - min) / 2
        const sy = (img.height - min) / 2
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size)
        setPhoto(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  }

  const save = async () => {
    setSaving(true)
    setMsg('')
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo,
          degrees,
          research_papers: papers,
          books_authored: books,
          patents,
          bio,
          phone,
        }),
      })
      setMsg(res.ok ? 'Profile saved ✓' : 'Could not save — try again.')
    } catch {
      setMsg('Network error — try again.')
    } finally {
      setSaving(false)
      setTimeout(() => setMsg(''), 4000)
    }
  }

  if (!authChecked || !p) return null

  return (
    <div className="profile-page">
      <section className="admin-card profile-hero">
        <label className="profile-photo" title="Change photo">
          {photo ? <img src={photo} alt="profile" /> : <span>{initials(p.name)}</span>}
          <span className="profile-photo-edit">
            <Icon name="refresh" size={14} /> Change
          </span>
          <input type="file" accept="image/*" hidden onChange={onPhoto} />
        </label>
        <div className="profile-hero-info">
          <h2 className="profile-hero-name">{p.name}</h2>
          {p.designation && <div className="profile-hero-desig">{p.designation}</div>}
          <div className="profile-hero-email">{p.email}</div>
          <span className="profile-role-badge is-faculty">{p.role}</span>
        </div>
      </section>

      <section className="admin-card profile-form">
        <div className="profile-form-grid">
          <label className="profile-field">
            <span className="profile-label">Degrees / Qualifications</span>
            <input value={degrees} onInput={(e) => setDegrees((e.target as HTMLInputElement).value)} placeholder="e.g. Ph.D., M.Com" />
          </label>
          <label className="profile-field">
            <span className="profile-label">Phone</span>
            <input value={phone} onInput={(e) => setPhone((e.target as HTMLInputElement).value)} placeholder="e.g. 98xxxxxxxx" />
          </label>
          <label className="profile-field">
            <span className="profile-label">Research Papers</span>
            <input value={papers} onInput={(e) => setPapers((e.target as HTMLInputElement).value)} placeholder="e.g. 12 International, 12 National" />
          </label>
          <label className="profile-field">
            <span className="profile-label">Books Authored</span>
            <input value={books} onInput={(e) => setBooks((e.target as HTMLInputElement).value)} placeholder="e.g. 2" />
          </label>
          <label className="profile-field">
            <span className="profile-label">Patents</span>
            <input value={patents} onInput={(e) => setPatents((e.target as HTMLInputElement).value)} placeholder="e.g. 1 (under process)" />
          </label>
        </div>
        <label className="profile-field">
          <span className="profile-label">About / Bio</span>
          <textarea
            rows={4}
            value={bio}
            onInput={(e) => setBio((e.target as HTMLTextAreaElement).value)}
            placeholder="A short introduction about yourself…"
          />
        </label>

        <div className="profile-save-row">
          <button type="button" className="btn-primary" disabled={saving || loading} onClick={save}>
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
          {msg && <span className="profile-save-msg">{msg}</span>}
        </div>
      </section>
    </div>
  )
}
