import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/Layout'
import StorageBootstrap from './components/StorageBootstrap'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Info = lazy(() => import('./pages/Info'))
const Plan = lazy(() => import('./pages/Plan'))
const Quiz = lazy(() => import('./pages/Quiz'))
const Notes = lazy(() => import('./pages/Notes'))
const Videos = lazy(() => import('./pages/Videos'))
const Timetable = lazy(() => import('./pages/Timetable'))
const Today = lazy(() => import('./pages/Today'))
const Overview = lazy(() => import('./pages/Overview'))
const History = lazy(() => import('./pages/History'))
const Resources = lazy(() => import('./pages/Resources'))
const SmartPlanner = lazy(() => import('./pages/SmartPlanner'))
const Assistant = lazy(() => import('./pages/Assistant'))
const NotFound = lazy(() => import('./pages/NotFound'))

function RouteFallback() {
  return (
    <div role="status" aria-live="polite" className="space-y-4 py-4">
      <span className="sr-only">กำลังโหลดหน้า</span>
      <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
      <div className="h-36 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map(item => <div key={item} className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />)}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <StorageBootstrap>
        <BrowserRouter>
          <Layout>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/today" element={<Today />} />
                <Route path="/overview" element={<Overview />} />
                <Route path="/history" element={<History />} />
                <Route path="/resources" element={<Resources />} />
                <Route path="/planner" element={<SmartPlanner />} />
                <Route path="/assistant" element={<Assistant />} />
                <Route path="/timetable" element={<Timetable />} />
                <Route path="/info" element={<Info />} />
                <Route path="/plan" element={<Plan />} />
                <Route path="/quiz" element={<Quiz />} />
                <Route path="/notes" element={<Notes />} />
                <Route path="/videos" element={<Videos />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </Layout>
        </BrowserRouter>
      </StorageBootstrap>
    </ThemeProvider>
  )
}
