import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

describe('Cards Usability & Responsive Views Hardening (Phase 4)', () => {
  describe('StatsCards Fluid Grid & Typography', () => {
    it('should support fluid grid down to 320px narrow screens', () => {
      const statsPath = path.resolve('src/components/StatsCards.tsx')
      const code = fs.readFileSync(statsPath, 'utf8')

      assert.match(code, /grid-cols-1/, 'Must support 1 column on narrow 320px mobile screens')
      assert.match(code, /min-\[420px\]:grid-cols-2/, 'Must transition to 2 columns on 420px+')
      assert.match(code, /lg:grid-cols-4/, 'Must transition to 4 columns on large screens')
      assert.match(code, /min-w-0/, 'Card containers must include min-w-0 to prevent flex blowout')
      assert.match(code, /break-words line-clamp-2/, 'Titles must break words without horizontal clipping')
    })
  })

  describe('ActivityCard Anti-Truncation & Touch Targets', () => {
    it('should use break-words line-clamp-2 instead of rigid truncate for title', () => {
      const cardPath = path.resolve('src/components/ActivityCard.tsx')
      const code = fs.readFileSync(cardPath, 'utf8')

      assert.match(code, /break-words line-clamp-2/, 'ActivityCard title must wrap gracefully with line-clamp-2')
      assert.match(code, /min-w-0/, 'Header row must include min-w-0')
    })

    it('should ensure action icon buttons have comfortable touch targets', () => {
      const cardPath = path.resolve('src/components/ActivityCard.tsx')
      const code = fs.readFileSync(cardPath, 'utf8')

      assert.match(code, /aria-label="Editar atividade"/, 'Edit button must have accessible aria-label')
      assert.match(code, /aria-label="Compartilhar com colega"/, 'Share button must have accessible aria-label')
      assert.match(code, /aria-label="Mais opções"/, 'More button must have accessible aria-label')
      assert.match(code, /w-9 h-9 sm:w-8 sm:h-8/, 'Action buttons must have minimum touch dimension')
    })
  })

  describe('CalendarView Small Viewport Month Cells', () => {
    it('should render compact indicator dots on mobile (<640px) and text badges on desktop', () => {
      const calPath = path.resolve('src/components/CalendarView.tsx')
      const code = fs.readFileSync(calPath, 'utf8')

      assert.match(code, /flex sm:hidden items-center justify-center gap-1/, 'Must render compact indicator dots on mobile screens')
      assert.match(code, /hidden sm:block space-y-1/, 'Must preserve textual labels on tablet and desktop')
    })
  })

  describe('ReportsView Responsive Dual Presentation', () => {
    it('should offer mobile-first card list on mobile and full analytical table on desktop', () => {
      const repPath = path.resolve('src/components/ReportsView.tsx')
      const code = fs.readFileSync(repPath, 'utf8')

      assert.match(code, /md:hidden divide-y divide-\[#F6E4EC\]/, 'Must provide mobile-friendly card view')
      assert.match(code, /hidden md:block overflow-x-auto/, 'Must wrap analytical table in desktop view with overflow safety')
      assert.match(code, /min-\[420px\]:grid-cols-2/, 'Summary cards must adapt gracefully to narrow viewports')
    })
  })
})
