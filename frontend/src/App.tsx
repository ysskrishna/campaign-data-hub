import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import HealthPage from './pages/HealthPage'
import MetricsPage from './pages/MetricsPage'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen antialiased">
        <header className="bg-white/90 backdrop-blur-sm border-b border-[var(--border)] sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-8">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--foreground)] text-white text-xs font-bold">
                CD
              </span>
              <span className="text-sm font-semibold tracking-tight">Campaign Data Hub</span>
            </div>
            <nav className="flex gap-1 text-sm" aria-label="Main">
              <NavLink
                to="/metrics"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                    isActive
                      ? 'bg-[var(--surface)] text-[var(--foreground)]'
                      : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                  }`
                }
              >
                Metrics
              </NavLink>
              <NavLink
                to="/health"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                    isActive
                      ? 'bg-[var(--surface)] text-[var(--foreground)]'
                      : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                  }`
                }
              >
                Data Health
              </NavLink>
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-8">
          <Routes>
            <Route path="/" element={<MetricsPage />} />
            <Route path="/metrics" element={<MetricsPage />} />
            <Route path="/health" element={<HealthPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
