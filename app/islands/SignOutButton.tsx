export default function SignOutButton() {
  const onClick = async () => {
    await fetch('/api/auth/signout', { method: 'POST' })
    window.location.href = '/signin'
  }

  return (
    <button type="button" className="counter" onClick={onClick}>
      Sign out
    </button>
  )
}
