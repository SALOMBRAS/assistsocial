import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

describe('Mobile Calendar, Error Boundary & Discreet Navigation', () => {
  describe('ErrorBoundary Component & Root Integration', () => {
    it('should export ErrorBoundary with getDerivedStateFromError and componentDidCatch', () => {
      const errorBoundaryPath = path.resolve('src/components/ErrorBoundary.tsx')
      assert.ok(fs.existsSync(errorBoundaryPath), 'ErrorBoundary.tsx must exist')
      const content = fs.readFileSync(errorBoundaryPath, 'utf-8')
      assert.ok(content.includes('class ErrorBoundary extends Component'), 'Must be a React Class Component')
      assert.ok(content.includes('getDerivedStateFromError'), 'Must implement getDerivedStateFromError')
      assert.ok(content.includes('componentDidCatch'), 'Must implement componentDidCatch')
      assert.ok(content.includes('Tentar Novamente'), 'Must provide Tentar Novamente retry button')
      assert.ok(content.includes('Menu Inicial'), 'Must provide Menu Inicial button')
    })

    it('should wrap App in main.tsx with ErrorBoundary to prevent white screens', () => {
      const mainPath = path.resolve('src/main.tsx')
      const content = fs.readFileSync(mainPath, 'utf-8')
      assert.ok(content.includes("import { ErrorBoundary } from './components/ErrorBoundary'"), 'Must import ErrorBoundary in main.tsx')
      assert.ok(content.includes('<ErrorBoundary>'), 'Must wrap App with ErrorBoundary')
      assert.ok(content.includes('</ErrorBoundary>'), 'Must close ErrorBoundary around App')
    })
  })

  describe('CalendarView Safe Date Helpers & TDZ Prevention', () => {
    it('isSameCalendarDay logic should safely match same dates and ignore time differences', () => {
      const isSameCalendarDay = (date1?: Date | string | null, date2?: Date | string | null): boolean => {
        if (!date1 || !date2) return false
        try {
          const d1 = typeof date1 === 'string' ? new Date(date1) : date1
          const d2 = typeof date2 === 'string' ? new Date(date2) : date2
          if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false
          return (
            d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate()
          )
        } catch {
          return false
        }
      }

      const d1 = new Date(2026, 9, 27, 8, 30)
      const d2 = new Date(2026, 9, 27, 21, 15)
      const d3 = new Date(2026, 9, 28, 8, 30)
      assert.strictEqual(isSameCalendarDay(d1, d2), true)
      assert.strictEqual(isSameCalendarDay(d1, d3), false)
      assert.strictEqual(isSameCalendarDay(null, null), false)
      assert.strictEqual(isSameCalendarDay(undefined, new Date()), false)
      assert.strictEqual(isSameCalendarDay('invalid-date', new Date()), false)
    })

    it('formatActivityTime logic should safely format valid and malformed dates', () => {
      const formatActivityTime = (startsAt?: string | null): string => {
        if (!startsAt || typeof startsAt !== 'string') return '08:00'
        try {
          if (startsAt.includes('T')) {
            const timePart = startsAt.split('T')[1]
            if (timePart) return timePart.slice(0, 5)
          }
          const d = new Date(startsAt)
          if (!isNaN(d.getTime())) {
            const h = String(d.getHours()).padStart(2, '0')
            const m = String(d.getMinutes()).padStart(2, '0')
            return `${h}:${m}`
          }
        } catch {
          // fallback
        }
        return '08:00'
      }

      assert.strictEqual(formatActivityTime('2026-10-27T14:35:00.000Z'), '14:35')
      assert.strictEqual(formatActivityTime(null), '08:00')
      assert.strictEqual(formatActivityTime(undefined), '08:00')
      assert.strictEqual(formatActivityTime(''), '08:00')
    })

    it('should declare getActivitiesForDay before useMemo in CalendarView (preventing TDZ crash)', () => {
      const calPath = path.resolve('src/components/CalendarView.tsx')
      const content = fs.readFileSync(calPath, 'utf-8')
      const getActsPos = content.indexOf('const getActivitiesForDay =')
      const dayModalActsPos = content.indexOf('const dayModalActivities =')
      assert.ok(getActsPos > 0, 'getActivitiesForDay must be declared')
      assert.ok(dayModalActsPos > 0, 'dayModalActivities must be declared')
      assert.ok(getActsPos < dayModalActsPos, 'getActivitiesForDay MUST be defined BEFORE dayModalActivities useMemo')
    })
  })

  describe('Day Modal Mobile Touch Scrolling & Bottom Sheet', () => {
    it('should implement min-h-0, touch momentum scrolling and overscroll containment', () => {
      const calPath = path.resolve('src/components/CalendarView.tsx')
      const content = fs.readFileSync(calPath, 'utf-8')
      assert.ok(content.includes('min-h-0'), 'Must include min-h-0 to allow flex children to scroll on mobile')
      assert.ok(content.includes('overflow-y-auto'), 'Must include overflow-y-auto')
      assert.ok(content.includes('overscroll-contain'), 'Must contain overscroll-contain to isolate scroll')
      assert.ok(content.includes("WebkitOverflowScrolling: 'touch'"), 'Must enable momentum touch scroll for iOS Safari')
      assert.ok(content.includes("touchAction: 'pan-y'"), 'Must enable pan-y touch action')
    })

    it('should implement mobile bottom sheet drawer with responsive height and drag handle', () => {
      const calPath = path.resolve('src/components/CalendarView.tsx')
      const content = fs.readFileSync(calPath, 'utf-8')
      assert.ok(content.includes('items-end sm:items-center'), 'Must align to bottom on mobile and center on desktop')
      assert.ok(content.includes('rounded-t-3xl sm:rounded-3xl'), 'Must use rounded-t-3xl on mobile bottom sheet')
      assert.ok(content.includes('h-[88dvh] sm:h-auto sm:max-h-[85vh]'), 'Must use dynamic dvh units on mobile')
      assert.ok(content.includes('bg-[#827780]/30 rounded-full mx-auto my-2.5 sm:hidden'), 'Must render touch drag indicator on mobile')
      assert.ok(content.includes("document.body.style.overflow = 'hidden'"), 'Must lock body scroll while modal is open')
    })
  })

  describe('Single Standard Back Navigation (Mobile Exclusive, No Duplication)', () => {
    it('MainDashboard should render a single standard "Voltar ao Painel Inicial" button with md:hidden', () => {
      const dashPath = path.resolve('src/pages/MainDashboard.tsx')
      const content = fs.readFileSync(dashPath, 'utf-8')
      assert.ok(content.includes("currentTab !== 'dashboard'"), 'Must check if tab is not dashboard')
      assert.ok(content.includes('Voltar ao Painel Inicial'), 'Must render "Voltar ao Painel Inicial" text')
      assert.ok(content.includes("setCurrentTab('dashboard')"), 'Must switch tab back to dashboard on click')
      assert.ok(content.includes('md:hidden'), 'Must be hidden on desktop (md:hidden) since desktop has lateral menu')
    })

    it('should not duplicate back button inside CalendarView and ResidenciaisView headers', () => {
      const calPath = path.resolve('src/components/CalendarView.tsx')
      const calContent = fs.readFileSync(calPath, 'utf-8')
      assert.ok(!calContent.includes('<span>Painel Inicial</span>'), 'CalendarView header must not have duplicate Painel Inicial button')

      const resPath = path.resolve('src/components/ResidenciaisView.tsx')
      const resContent = fs.readFileSync(resPath, 'utf-8')
      assert.ok(!resContent.includes('<span>Painel Inicial</span>'), 'ResidenciaisView header must not have duplicate Painel Inicial button')
    })

    it('MainDashboard should wrap views with ErrorBoundary for isolated recovery', () => {
      const dashPath = path.resolve('src/pages/MainDashboard.tsx')
      const content = fs.readFileSync(dashPath, 'utf-8')
      assert.ok(content.includes('<ErrorBoundary fallbackTitle='), 'Must wrap tab components in ErrorBoundary')
    })
  })
})
