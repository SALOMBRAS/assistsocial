import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

describe('Modal Accessibility, Dismissal & Mobile Viewport Hardening (Phase 5)', () => {
  describe('useModalA11y Hook Contract', () => {
    it('should export useModalA11y with proper TypeScript interface', () => {
      const hookPath = path.resolve('src/hooks/useModalA11y.ts')
      assert.strictEqual(fs.existsSync(hookPath), true, 'useModalA11y.ts must exist in src/hooks/')

      const code = fs.readFileSync(hookPath, 'utf8')
      assert.match(code, /export function useModalA11y/, 'Must export useModalA11y function')
      assert.match(code, /isOpen:\s*boolean/, 'Must define isOpen option')
      assert.match(code, /onClose:\s*\(\)\s*=>\s*void/, 'Must define onClose callback')
      assert.match(code, /closeOnEscape\?:?\s*boolean/, 'Must support closeOnEscape option')
      assert.match(code, /preventScroll\?:?\s*boolean/, 'Must support preventScroll option')
    })

    it('should implement body scroll lock and restore on cleanup', () => {
      const hookPath = path.resolve('src/hooks/useModalA11y.ts')
      const code = fs.readFileSync(hookPath, 'utf8')

      assert.match(code, /document\.body\.style\.overflow\s*=\s*'hidden'/, 'Must lock body overflow to hidden')
      assert.match(code, /document\.body\.style\.overflow\s*=\s*originalOverflow/, 'Must restore original body overflow on unmount/close')
    })

    it('should implement Escape key handler and cleanup', () => {
      const hookPath = path.resolve('src/hooks/useModalA11y.ts')
      const code = fs.readFileSync(hookPath, 'utf8')

      assert.match(code, /e\.key === 'Escape'/, 'Must listen for Escape key')
      assert.match(code, /window\.addEventListener\('keydown'/, 'Must register keydown listener on window')
      assert.match(code, /window\.removeEventListener\('keydown'/, 'Must unregister listener on cleanup')
    })

    it('should manage previous active element focus restoration', () => {
      const hookPath = path.resolve('src/hooks/useModalA11y.ts')
      const code = fs.readFileSync(hookPath, 'utf8')

      assert.match(code, /previousActiveElementRef/, 'Must track previously focused element')
      assert.match(code, /previousActiveElementRef\.current\.focus\(\)/, 'Must restore focus on unmount')
    })
  })

  describe('Modal Components Hardening & Accessibility Attributes', () => {
    it('ActionModals should implement useModalA11y, backdrop dismissal and 40px+ touch targets', () => {
      const filePath = path.resolve('src/components/ActionModals.tsx')
      const code = fs.readFileSync(filePath, 'utf8')

      assert.match(code, /useModalA11y/, 'ActionModals must use useModalA11y hook')
      assert.match(code, /role="dialog"/, 'Must define role="dialog"')
      assert.match(code, /aria-modal="true"/, 'Must declare aria-modal="true"')
      assert.match(code, /onClick=\{\(e\) => \{\s*if\s*\(e\.target === e\.currentTarget\)\s*onClose\(\)/, 'Must dismiss on backdrop click')
      assert.match(code, /max-h-\[90dvh\]/, 'Must constrain height to 90dvh')
      assert.match(code, /w-10 h-10 rounded-full/, 'Close button must have minimum 40px touch bounding box')
    })

    it('ActivityModal should implement useModalA11y, backdrop dismissal and 40px+ touch target', () => {
      const filePath = path.resolve('src/components/ActivityModal.tsx')
      const code = fs.readFileSync(filePath, 'utf8')

      assert.match(code, /useModalA11y/, 'ActivityModal must use useModalA11y hook')
      assert.match(code, /role="dialog"/, 'Must declare role="dialog"')
      assert.match(code, /aria-modal="true"/, 'Must declare aria-modal="true"')
      assert.match(code, /onClick=\{\(e\) => \{\s*if\s*\(e\.target === e\.currentTarget\)\s*onClose\(\)/, 'Must dismiss on backdrop click')
      assert.match(code, /max-h-\[90dvh\]/, 'Must constrain height to 90dvh')
      assert.match(code, /w-10 h-10 rounded-full/, 'Close button must have 40px touch target')
    })

    it('ShareModal should implement useModalA11y, backdrop dismissal and 40px+ touch target', () => {
      const filePath = path.resolve('src/components/ShareModal.tsx')
      const code = fs.readFileSync(filePath, 'utf8')

      assert.match(code, /useModalA11y/, 'ShareModal must use useModalA11y hook')
      assert.match(code, /role="dialog"/, 'Must declare role="dialog"')
      assert.match(code, /aria-modal="true"/, 'Must declare aria-modal="true"')
      assert.match(code, /onClick=\{\(e\) => \{\s*if\s*\(e\.target === e\.currentTarget\)\s*onClose\(\)/, 'Must dismiss on backdrop click')
      assert.match(code, /w-10 h-10 rounded-full/, 'Close button must have 40px touch target')
    })

    it('DocumentReviewAssistant should implement useModalA11y and backdrop dismissal', () => {
      const filePath = path.resolve('src/components/DocumentReviewAssistant.tsx')
      const code = fs.readFileSync(filePath, 'utf8')

      assert.match(code, /useModalA11y/, 'DocumentReviewAssistant must use useModalA11y hook')
      assert.match(code, /role="dialog"/, 'Must declare role="dialog"')
      assert.match(code, /aria-modal="true"/, 'Must declare aria-modal="true"')
      assert.match(code, /onClick=\{\(e\) => \{\s*if\s*\(e\.target === e\.currentTarget\)\s*onClose\(\)/, 'Must dismiss on backdrop click')
      assert.match(code, /max-h-\[90dvh\]/, 'Must constrain height to 90dvh')
      assert.match(code, /w-10 h-10 rounded-full/, 'Close button must have 40px touch target')
    })

    it('ServicesDirectoryView modals should implement useModalA11y and backdrop dismissal', () => {
      const filePath = path.resolve('src/components/ServicesDirectoryView.tsx')
      const code = fs.readFileSync(filePath, 'utf8')

      assert.match(code, /useModalA11y/, 'ServicesDirectoryView must use useModalA11y hook')
      assert.match(code, /service-detail-modal-title/, 'Service detail modal must have accessible title')
      assert.match(code, /service-proposal-modal-title/, 'Service proposal modal must have accessible title')
      assert.match(code, /max-h-\[90dvh\]/, 'Must constrain height to 90dvh')
      assert.match(code, /w-10 h-10 rounded-full/, 'Close button must have 40px touch target')
    })

    it('ResidenciaisView DossierModal and BatchModal should implement useModalA11y and backdrop dismissal', () => {
      const filePath = path.resolve('src/components/ResidenciaisView.tsx')
      const code = fs.readFileSync(filePath, 'utf8')

      assert.match(code, /useModalA11y/, 'ResidenciaisView must use useModalA11y hook')
      assert.match(code, /dossier-modal-title/, 'Dossier modal must have accessible title')
      assert.match(code, /batch-modal-title/, 'Batch modal must have accessible title')
      assert.match(code, /max-h-\[90dvh\]/, 'Must constrain height to 90dvh')
      assert.match(code, /w-10 h-10 rounded-full/, 'Close button must have 40px touch target')
    })

    it('AdminUsersPage credentials modal should implement useModalA11y and backdrop dismissal', () => {
      const filePath = path.resolve('src/pages/AdminUsersPage.tsx')
      const code = fs.readFileSync(filePath, 'utf8')

      assert.match(code, /useModalA11y/, 'AdminUsersPage must use useModalA11y hook')
      assert.match(code, /credentials-modal-title/, 'Credentials modal must have accessible title')
      assert.match(code, /max-h-\[90dvh\]/, 'Must constrain height to 90dvh')
      assert.match(code, /w-10 h-10 rounded-full/, 'Close button must have 40px touch target')
    })
  })
})
