import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

describe('Mobile Navigation, Drawer & BottomNav Architecture (Phase 6)', () => {
  describe('Header Mobile Navigation Integration', () => {
    it('should support onToggleMobileMenu and render mobile hamburger trigger', () => {
      const headerPath = path.resolve('src/components/Header.tsx')
      const code = fs.readFileSync(headerPath, 'utf8')

      assert.match(code, /onToggleMobileMenu\?:?\s*\(\)\s*=>\s*void/, 'HeaderProps must include onToggleMobileMenu callback')
      assert.match(code, /aria-label="Abrir menu de navegação"/, 'Must provide accessible aria-label on mobile hamburger button')
      assert.match(code, /md:hidden/, 'Hamburger button must only be visible on mobile screens')
      assert.match(code, /env\(safe-area-inset-top\)/, 'Header must respect safe-area-inset-top for iPhone notch/Dynamic Island')
    })
  })

  describe('Sidebar Mobile Drawer Implementation', () => {
    it('should accept isMobileOpen and onCloseMobile props', () => {
      const sidebarPath = path.resolve('src/components/Sidebar.tsx')
      const code = fs.readFileSync(sidebarPath, 'utf8')

      assert.match(code, /isMobileOpen\?:?\s*boolean/, 'SidebarProps must include isMobileOpen')
      assert.match(code, /onCloseMobile\?:?\s*\(\)\s*=>\s*void/, 'SidebarProps must include onCloseMobile')
    })

    it('should integrate useModalA11y for escape key handling and scroll lock', () => {
      const sidebarPath = path.resolve('src/components/Sidebar.tsx')
      const code = fs.readFileSync(sidebarPath, 'utf8')

      assert.match(code, /useModalA11y\(\{/, 'Sidebar must invoke useModalA11y hook')
      assert.match(code, /closeOnEscape:\s*true/, 'Must close drawer on Escape key')
      assert.match(code, /preventScroll:\s*true/, 'Must lock body scroll while drawer is open')
    })

    it('should render accessible mobile slide-in drawer with safe-area insets', () => {
      const sidebarPath = path.resolve('src/components/Sidebar.tsx')
      const code = fs.readFileSync(sidebarPath, 'utf8')

      assert.match(code, /role="dialog"/, 'Mobile drawer must declare role="dialog"')
      assert.match(code, /aria-modal="true"/, 'Mobile drawer must declare aria-modal="true"')
      assert.match(code, /env\(safe-area-inset-top\)/, 'Drawer must respect top safe area')
      assert.match(code, /env\(safe-area-inset-bottom\)/, 'Drawer must respect bottom safe area')
      assert.match(code, /aria-label="Fechar menu"/, 'Must provide accessible close button')
      assert.match(code, /w-10 h-10 rounded-full/, 'Close button must have 40px+ touch target')
    })

    it('should expose all 10 core views and close drawer on tab selection', () => {
      const sidebarPath = path.resolve('src/components/Sidebar.tsx')
      const code = fs.readFileSync(sidebarPath, 'utf8')

      const tabs = ['dashboard', 'activities', 'calendar', 'residenciais', 'timeline', 'reports', 'services', 'documents', 'team', 'settings']
      tabs.forEach((tab) => {
        assert.match(code, new RegExp(`id:\\s*'${tab}'`), `Sidebar menuItems must contain ${tab}`)
      })

      assert.match(code, /onCloseMobile\?\.\(\)/, 'Must call onCloseMobile when a tab is selected')
    })

    it('should support admin link and logout in mobile drawer', () => {
      const sidebarPath = path.resolve('src/components/Sidebar.tsx')
      const code = fs.readFileSync(sidebarPath, 'utf8')

      assert.match(code, /\/admin\/usuarios/, 'Must link to admin users page if isAdmin is true')
      assert.match(code, /aria-label="Encerrar Sessão"/, 'Must provide mobile logout button')
    })
  })

  describe('BottomNav Safe Areas & Expansion to All Views', () => {
    it('should include safe-area bottom padding and 44px touch targets', () => {
      const bottomNavPath = path.resolve('src/components/BottomNav.tsx')
      const code = fs.readFileSync(bottomNavPath, 'utf8')

      assert.match(code, /env\(safe-area-inset-bottom\)/, 'BottomNav must dynamically calculate bottom safe area')
      assert.match(code, /min-h-\[44px\]/, 'Interactive buttons must fulfill 44px touch target guidelines')
    })

    it('should support onToggleMore and highlight secondary active tabs', () => {
      const bottomNavPath = path.resolve('src/components/BottomNav.tsx')
      const code = fs.readFileSync(bottomNavPath, 'utf8')

      assert.match(code, /onToggleMore\?:?\s*\(\)\s*=>\s*void/, 'BottomNavProps must accept onToggleMore')
      assert.match(code, /isMoreActive/, 'Must compute active status for secondary views')
      assert.match(code, /Mais/, 'Must render "Mais" label to access all views on mobile')
    })
  })

  describe('MainDashboard Responsive Layout Protection', () => {
    it('should manage isMobileNavOpen state and provide safe area padding to main content', () => {
      const dashboardPath = path.resolve('src/pages/MainDashboard.tsx')
      const code = fs.readFileSync(dashboardPath, 'utf8')

      assert.match(code, /isMobileNavOpen/, 'MainDashboard must manage isMobileNavOpen state')
      assert.match(code, /calc\(6\.5rem\+env\(safe-area-inset-bottom\)\)/, 'Main content container must pad bottom to prevent overlap with BottomNav and iOS home indicator')
    })
  })
})
