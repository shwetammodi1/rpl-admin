import { createRoute } from '../lib/factory'
import Counter from '../islands/Counter'

export default createRoute((c) => {
  const user = c.get('user')

  return c.render(
    <main>
      <h1>RPL Admin</h1>
      <p>
        Built with <code>HonoX</code>, running on <code>Cloudflare Workers</code>.
      </p>
      <Counter />
      <p>
        {user ? (
          <a href="/dashboard">Go to dashboard</a>
        ) : (
          <>
            <a href="/signin">Sign in</a> or <a href="/signup">Sign up</a>
          </>
        )}
      </p>
    </main>,
    { title: 'RPL Admin' }
  )
})
