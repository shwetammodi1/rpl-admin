export default function SignOutButton() {
  const onClick = async () => {
    const token = localStorage.getItem('rpl_token')
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    localStorage.removeItem('rpl_token')
    window.location.href = '/'
  }

  return (
    <button type="button" className="btn-outline" onClick={onClick}>
      Sign out
    </button>
  )
}
