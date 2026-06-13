import { createRoute } from '../lib/factory'
import SignOutButton from '../islands/SignOutButton'
import WelcomeGuard from '../islands/WelcomeGuard'

export default createRoute((c) => {
  return c.render(
    <>
      <header className="welcome-topbar">
        <div className="login-crest">RPL</div>
        <p className="welcome-topbar-title">RPL Maheshwari College · Indore · Madhya Pradesh</p>
        <SignOutButton />
      </header>

      <section className="welcome-hero">
        <span className="welcome-chip">⏳ Account awaiting approval</span>
        <h1>
          Welcome to RPL Maheshwari, <span id="welcome-firstname" className="gold-text">there</span>.
        </h1>
        <p className="welcome-hero-support">
          Your dashboard will appear here as soon as HR or the master admin assigns your role and department.
          Please check back soon.
        </p>
      </section>

      <div className="welcome-content">
        <div className="welcome-action-card">
          <div className="welcome-action-icon">👥</div>
          <div>
            <h2>Need access? Contact your administrator</h2>
            <p>
              Reach out to the HR &amp; Administration office with your name and department. You'll receive an
              email notification once your account is activated.
            </p>
          </div>
        </div>

        <div className="welcome-info-grid">
          <div className="welcome-info-card">
            <h3>About the College</h3>
            <ul>
              <li>Established 1999</li>
              <li>NAAC Accredited</li>
              <li>UGC Approved</li>
            </ul>
          </div>
          <div className="welcome-info-card">
            <h3>Programs Offered</h3>
            <p>B.Com · BBA · BCA · BA · M.Com · MBA · MCA · MA</p>
            <p>95% placement record</p>
          </div>
          <div className="welcome-info-card">
            <h3>Reach Us</h3>
            <p>Indore, Madhya Pradesh</p>
            <p>rplmaheshwari@gmail.com</p>
            <p>rplmaheshwari.com</p>
          </div>
        </div>

        <div className="welcome-stats">
          <div>
            <div className="welcome-stat-value">25+</div>
            <div className="welcome-stat-label">Years</div>
          </div>
          <div>
            <div className="welcome-stat-value">8</div>
            <div className="welcome-stat-label">Programs</div>
          </div>
          <div>
            <div className="welcome-stat-value">95%</div>
            <div className="welcome-stat-label">Placement</div>
          </div>
          <div>
            <div className="welcome-stat-value">NAAC</div>
            <div className="welcome-stat-label">Accredited</div>
          </div>
        </div>
      </div>

      <WelcomeGuard />
    </>,
    { title: 'Welcome - RPL Maheshwari College' }
  )
})
