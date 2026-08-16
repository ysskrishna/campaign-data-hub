import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import HealthPage from './pages/HealthPage'
import MetricsPage from './pages/MetricsPage'

function App() {
  return (
    <BrowserRouter>
      <div className="bg-white text-[#0d0d0d] min-h-screen antialiased">
        <header className="border-b border-[#e5e5e5]">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-8">
            <span className="text-base font-medium">Campaign Data Hub</span>
            <nav className="flex gap-6 text-sm">
              <NavLink
                to="/metrics"
                className={({ isActive }) =>
                  `pb-3 -mb-[1px] border-b-2 font-medium ${isActive ? 'border-[#0d0d0d] text-[#0d0d0d]' : 'border-transparent text-[#6b6b6b]'}`
                }
              >
                Metrics
              </NavLink>
              <NavLink
                to="/health"
                className={({ isActive }) =>
                  `pb-3 -mb-[1px] border-b-2 font-medium ${isActive ? 'border-[#0d0d0d] text-[#0d0d0d]' : 'border-transparent text-[#6b6b6b]'}`
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
